/** Most cloud layers the shader handles, like the low, mid and high layers of a flight simulator */
export const MAX_LAYERS = 4;

/**
 * Ray marches the cloud layers at a reduced resolution. Outputs, premultiplied and ready to blend
 * over the map (`ONE, ONE_MINUS_SRC_ALPHA`):
 * - `outColor.rgb`: the light the clouds scatter towards the camera, tone mapped, plus the shadow tint
 * - `outColor.a`: how much of the map they hide, including the shadows they cast on it
 * - `outDepth.r`: how far the clouds (or the ground) are, in km, to reproject the next frame
 *
 * The scene is the `<Canvas>` space: meters, `+Y` up, the ground at `uGroundAltitude`.
 */
export const CLOUDS_FRAGMENT = /* glsl */`
precision highp float;
precision highp sampler3D;

#define MAX_LAYERS ${MAX_LAYERS}
#define PI 3.141592653589793

uniform mat4 uInvViewProj;
uniform vec3 uCameraPosition;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
uniform vec3 uGroundColor;
uniform float uExposure;

uniform sampler3D uShapeNoise;
uniform sampler3D uDetailNoise;
uniform sampler2D uWeather;

uniform int uSteps;
uniform int uLightSteps;
uniform int uShadowSteps;
uniform float uMaxDistance;
uniform float uDetailDistance;
uniform float uExtent;
uniform float uExtinction;
uniform float uGroundAltitude;
uniform float uFrame;

uniform float uShadows;
uniform float uShadowStrength;
uniform vec3 uShadowColor;

uniform int uLayerCount;
/** bottom, top, coverage, density */
uniform vec4 uLayerA[MAX_LAYERS];
/** type (0 stratus .. 1 cumulus), erosion, 1 / size, 1 / detail size */
uniform vec4 uLayerB[MAX_LAYERS];
/** wind offset xz, detail offset xz, in meters */
uniform vec4 uLayerC[MAX_LAYERS];

uniform float uPowder;

varying vec2 vUv;

layout(location = 0) out highp vec4 outColor;
layout(location = 1) out highp vec4 outDepth;

float saturate(float x) { return clamp(x, 0.0, 1.0); }

float remap(float x, float a, float b, float c, float d) {
  return c + (x - a) / (b - a) * (d - c);
}

/** interleaved gradient noise, to hide the step pattern of the ray march */
float jitter(vec2 pixel) {
  pixel += uFrame * 5.588238;
  return fract(52.9829189 * fract(dot(pixel, vec2(0.06711056, 0.00583715))));
}

/** where along the ray it is between two altitudes, x > y if never */
vec2 slab(vec3 origin, vec3 direction, float bottom, float top, float tMax) {
  if (abs(direction.y) < 1e-5) {
    return origin.y >= bottom && origin.y <= top ? vec2(0.0, tMax) : vec2(1.0, 0.0);
  }
  float t0 = (bottom - origin.y) / direction.y;
  float t1 = (top - origin.y) / direction.y;
  return vec2(max(min(t0, t1), 0.0), min(max(t0, t1), tMax));
}

/** where along the ray it is inside the cloud field, a vertical cylinder around the origin */
vec2 field(vec3 origin, vec3 direction, float tMax) {
  vec2 o = origin.xz, d = direction.xz;
  float a = dot(d, d);
  float b = dot(o, d);
  float c = dot(o, o) - uExtent * uExtent;
  if (a < 1e-12) return c <= 0.0 ? vec2(0.0, tMax) : vec2(1.0, 0.0);
  float h = b * b - a * c;
  if (h < 0.0) return vec2(1.0, 0.0);
  h = sqrt(h);
  return vec2(max((-b - h) / a, 0.0), min((-b + h) / a, tMax));
}

/** flat bases, tops that round off; the puffier the type, the more the tops taper */
float heightProfile(float h, float type) {
  float bottom = smoothstep(0.0, mix(0.2, 0.07, type), h);
  float top = 1.0 - smoothstep(mix(0.6, 0.3, type), 1.0, h);
  return bottom * top;
}

float layerDensity(int i, vec3 p, bool detailed) {
  vec4 A = uLayerA[i];
  vec4 B = uLayerB[i];
  vec4 C = uLayerC[i];
  float h = (p.y - A.x) / (A.y - A.x);
  if (h <= 0.0 || h >= 1.0) return 0.0;

  vec2 xz = p.xz + C.xy;

  // weather: each blob is roughly one cloud, and a larger pattern bunches them together
  vec2 weatherUv = xz * B.z / 3.0 + float(i) * 0.37;
  vec4 weather = textureLod(uWeather, weatherUv, 0.0);
  float bunching = textureLod(uWeather, weatherUv * 0.23 + 0.5, 0.0).g;
  float cells = mix(weather.b, weather.r, 0.35);
  float coverage = saturate(A.z + (bunching - 0.5) * 0.6 * (1.0 - A.z));
  float mask = saturate(remap(cells, 1.0 - coverage, 1.0, 0.0, 1.0));
  if (mask <= 0.0) return 0.0;

  // body of the cloud, taller where the weather blob is stronger
  vec4 shape = textureLod(uShapeNoise, vec3(xz, p.y * 1.5).xzy * B.z * 1.6, 0.0);
  float fbm = shape.g * 0.625 + shape.b * 0.25 + shape.a * 0.125;
  float base = remap(shape.r, fbm - 1.0, 1.0, 0.0, 1.0);
  float profile = heightProfile(h / mix(0.35, 1.0, sqrt(mask)), B.x);
  float cloud = saturate(remap(base * profile, 1.0 - mask, 1.0, 0.0, 1.0));
  if (cloud <= 0.0) return 0.0;

  if (detailed) {
    // wispy at the bottom, billowy at the top
    vec3 detail = textureLod(uDetailNoise, vec3(xz + C.zw, p.y).xzy * B.w, 0.0).rgb;
    float detailFbm = detail.r * 0.625 + detail.g * 0.25 + detail.b * 0.125;
    float erosion = mix(detailFbm, 1.0 - detailFbm, saturate(h * 4.0)) * B.y;
    cloud = saturate(remap(cloud, erosion * 0.6, 1.0, 0.0, 1.0));
  }

  // fade the field out towards its edge
  cloud *= 1.0 - smoothstep(uExtent * 0.7, uExtent, length(p.xz));
  return cloud * A.w;
}

/** optical depth towards the sun, through the layers above \`minBottom\` */
float opticalDepthToSun(vec3 p, float minBottom, int steps) {
  float depth = 0.0;
  for (int i = 0; i < MAX_LAYERS; i++) {
    if (i >= uLayerCount) break;
    vec4 A = uLayerA[i];
    if (A.x < minBottom || A.y <= p.y) continue;
    vec2 span = slab(p, uSunDirection, A.x, A.y, 60000.0);
    if (span.x >= span.y) continue;
    float ds = (span.y - span.x) / float(steps);
    for (int j = 0; j < 16; j++) {
      if (j >= steps) break;
      vec3 q = p + uSunDirection * (span.x + (float(j) + 0.5) * ds);
      depth += layerDensity(i, q, false) * ds;
    }
  }
  return depth * uExtinction;
}

float henyeyGreenstein(float cosTheta, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

/** forward scattering for the silver lining, some back scattering for the shadowed side */
float phase(float cosTheta, float eccentricity) {
  return mix(henyeyGreenstein(cosTheta, 0.8 * eccentricity), henyeyGreenstein(cosTheta, -0.3 * eccentricity), 0.3);
}

/** light reaching a point inside the cloud, approximating multiple scattering with octaves */
vec3 sunLight(float opticalDepth, float cosTheta) {
  float a = 1.0, b = 1.0, c = 1.0, sum = 0.0;
  for (int k = 0; k < 3; k++) {
    sum += a * exp(-opticalDepth * b) * phase(cosTheta, c);
    a *= 0.7; b *= 0.4; c *= 0.5;
  }
  return uSunColor * sum;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 origin = uCameraPosition;
  vec4 near = uInvViewProj * vec4(ndc, -1.0, 1.0);
  vec3 direction = normalize(near.xyz / near.w - origin);

  // nothing to see from under the ground
  if (origin.y < uGroundAltitude) {
    outColor = vec4(0.0);
    outDepth = vec4(uMaxDistance / 1000.0);
    return;
  }

  float tGround = direction.y < 0.0 ? (uGroundAltitude - origin.y) / direction.y : 1e30;
  float tMax = min(tGround, uMaxDistance);
  vec2 inField = field(origin, direction, tMax);

  // layer spans along the ray, sorted from near to far
  vec2 spans[MAX_LAYERS];
  int order[MAX_LAYERS];
  int count = 0;
  for (int i = 0; i < MAX_LAYERS; i++) {
    if (i >= uLayerCount) break;
    vec2 span = slab(origin, direction, uLayerA[i].x, uLayerA[i].y, tMax);
    span = vec2(max(span.x, inField.x), min(span.y, inField.y));
    if (span.x >= span.y) continue;
    int j = count++;
    spans[j] = span;
    order[j] = i;
    // insertion sort, at most 4 layers
    for (int k = MAX_LAYERS - 1; k > 0; k--) {
      if (k > j) continue;
      if (spans[k - 1].x <= spans[k].x) break;
      vec2 s = spans[k]; spans[k] = spans[k - 1]; spans[k - 1] = s;
      int o = order[k]; order[k] = order[k - 1]; order[k - 1] = o;
    }
  }

  float cosTheta = dot(direction, uSunDirection);
  float noise = jitter(gl_FragCoord.xy);
  bool daylight = uSunDirection.y > 0.01;

  vec3 light = vec3(0.0);
  float transmittance = 1.0;
  // distance of the clouds, weighted by how much of them is visible
  float depthSum = 0.0;

  for (int n = 0; n < MAX_LAYERS; n++) {
    if (n >= count || transmittance < 0.01) break;
    int i = order[n];
    vec2 span = spans[n];
    vec4 A = uLayerA[i];
    float thickness = A.y - A.x;

    // light the layers above let through
    vec3 entry = origin + direction * span.x;
    float above = daylight ? exp(-opticalDepthToSun(entry, A.y, 4)) : 0.0;

    // spread the samples along the span, closer together near the camera when the span starts
    // right in front of it (flying in a layer), evenly when it is far away
    float spanLength = span.y - span.x;
    float spread = 1.0 + saturate(spanLength / (span.x + 2000.0));
    float steps = float(uSteps);
    for (int s = 0; s < 512; s++) {
      if (s >= uSteps || transmittance < 0.01) break;
      float t = span.x + spanLength * pow((float(s) + noise) / steps, spread);
      float ds = spanLength * (pow((float(s) + noise + 1.0) / steps, spread) - pow((float(s) + noise) / steps, spread));
      if (t > span.y) break;
      vec3 p = origin + direction * t;
      float density = layerDensity(i, p, t < uDetailDistance);

      if (density > 0.0) {
        float h = saturate((p.y - A.x) / thickness);

        // self shadowing: march towards the sun, with longer and longer steps
        float toTop = daylight ? min((A.y - p.y) / uSunDirection.y, thickness * 3.0) : 0.0;
        float depth = 0.0;
        for (int l = 0; l < 16; l++) {
          if (l >= uLightSteps || !daylight) break;
          float u0 = float(l) / float(uLightSteps), u1 = float(l + 1) / float(uLightSteps);
          float ls = toTop * (u1 * u1 - u0 * u0);
          vec3 q = p + uSunDirection * (toTop * 0.5 * (u0 * u0 + u1 * u1));
          depth += layerDensity(i, q, false) * ls;
        }

        float extinction = density * uExtinction;
        // "powder": seen from the sunny side, the thin edges of billows scatter less light back,
        // which draws the dark creases between them
        float powder = mix(1.0, 1.0 - exp(-extinction * 90.0), uPowder * saturate(0.6 - 0.6 * cosTheta));
        vec3 sun = daylight ? sunLight(depth * uExtinction, cosTheta) * above * powder : vec3(0.0);
        vec3 ambient = mix(uGroundColor, uSkyColor, h * h * (3.0 - 2.0 * h));
        vec3 scattering = (sun + ambient) * extinction;
        float stepTransmittance = exp(-extinction * ds);

        // haze: distant clouds fade into the map instead of ending abruptly
        float fade = exp(-t / (uMaxDistance * 0.45));
        light += transmittance * fade * (scattering - scattering * stepTransmittance) / extinction;
        float next = mix(transmittance, transmittance * stepTransmittance, fade);
        depthSum += (transmittance - next) * t;
        transmittance = next;
      }
    }
  }

  // shadows on the map where the ray hits the ground
  float lit = 1.0;
  if (uShadows > 0.5 && daylight && tGround < uMaxDistance && transmittance > 0.01) {
    vec3 ground = origin + direction * tGround;
    // fade them out far away and at grazing angles, where the map fades into its fog
    float fade = (1.0 - smoothstep(uMaxDistance * 0.25, uMaxDistance * 0.6, tGround))
      * smoothstep(0.02, 0.12, -direction.y);
    float sunTransmittance = exp(-opticalDepthToSun(ground, -1e9, uShadowSteps));
    lit = 1.0 - uShadowStrength * (1.0 - sunTransmittance) * fade;
  }

  // tone map the clouds on their own, the map underneath keeps its colours
  float alpha = 1.0 - transmittance;
  vec3 clouds = alpha > 1e-4 ? toSRGB(aces(light * uExposure / alpha)) * alpha : vec3(0.0);
  vec3 shadow = transmittance * (1.0 - lit) * uShadowColor;
  outColor = vec4(clouds + shadow, 1.0 - transmittance * lit);

  float background = min(tGround, uMaxDistance);
  outDepth = vec4((alpha > 0.05 ? depthSum / alpha : background) / 1000.0);
}
`;

/**
 * Blends this frame's clouds with the previous frames', reprojected to where they are now,
 * which averages out the noise of the ray march.
 */
export const RESOLVE_FRAGMENT = /* glsl */`
precision highp float;
uniform sampler2D uCurrent;
uniform sampler2D uDepth;
uniform sampler2D uHistory;
uniform mat4 uInvViewProj;
uniform mat4 uPrevViewProj;
uniform vec3 uCameraPosition;
uniform vec2 uTexel;
uniform float uBlend;
uniform float uReset;
varying vec2 vUv;

void main() {
  vec4 current = texture2D(uCurrent, vUv);
  if (uReset > 0.5) {
    gl_FragColor = current;
    return;
  }

  // where this pixel's clouds were on screen in the previous frame
  float distance = texture2D(uDepth, vUv).r * 1000.0;
  vec4 near = uInvViewProj * vec4(vUv * 2.0 - 1.0, -1.0, 1.0);
  vec3 direction = normalize(near.xyz / near.w - uCameraPosition);
  vec4 previous = uPrevViewProj * vec4(uCameraPosition + direction * distance, 1.0);
  vec2 uv = previous.xy / previous.w * 0.5 + 0.5;
  if (previous.w <= 0.0 || any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
    gl_FragColor = current;
    return;
  }

  // keep the history within what the neighbourhood looks like now, so nothing ghosts
  vec4 low = current, high = current;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec4 neighbour = texture2D(uCurrent, vUv + vec2(float(x), float(y)) * uTexel);
      low = min(low, neighbour);
      high = max(high, neighbour);
    }
  }
  vec4 history = clamp(texture2D(uHistory, uv), low, high);
  gl_FragColor = mix(history, current, uBlend);
}
`;

/** Upsamples the clouds over the scene */
export const COMPOSITE_FRAGMENT = /* glsl */`
precision highp float;
uniform sampler2D uClouds;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uClouds, vUv);
}
`;
