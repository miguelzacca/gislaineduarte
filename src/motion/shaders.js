const surfaceDeclarations = /* glsl */ `
uniform float uBrandAssembly;
uniform float uBrandOpening;
uniform float uBrandEnergy;
uniform float uBrandProgress;
uniform float uBrandFocus;
uniform float uBrandPart;
uniform vec3 uBrandGold;
varying vec3 vBrandPosition;

float brandHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float brandNoise(vec3 p) {
  vec3 cell = floor(p);
  vec3 local = fract(p);
  vec3 blend = local * local * (3.0 - 2.0 * local);
  return mix(
    mix(mix(brandHash(cell), brandHash(cell + vec3(1, 0, 0)), blend.x),
        mix(brandHash(cell + vec3(0, 1, 0)), brandHash(cell + vec3(1, 1, 0)), blend.x), blend.y),
    mix(mix(brandHash(cell + vec3(0, 0, 1)), brandHash(cell + vec3(1, 0, 1)), blend.x),
        mix(brandHash(cell + vec3(0, 1, 1)), brandHash(cell + vec3(1, 1, 1)), blend.x), blend.y), blend.z);
}
`;

/** Patches the PBR surface only; portrait pixels never enter this shader. */
export function attachNarrativeSurface(material, { uniforms, origin, part, diagnostics }) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, {
      uBrandOrigin: { value: origin },
      uBrandPart: { value: part },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uBrandOrigin;
        varying vec3 vBrandPosition;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vBrandPosition = position + uBrandOrigin;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${surfaceDeclarations}`)
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
        float brandHeight = clamp((vBrandPosition.y + 3.5) / 7.0, 0.0, 1.0);
        float brandGrain = brandNoise(vBrandPosition * 3.3 + vec3(uBrandPart * 0.17));
        float brandField = brandHeight * 0.77 + brandGrain * 0.23;
        float brandThreshold = mix(-0.045, 1.045, uBrandAssembly);
        if (brandField > brandThreshold) discard;
        float brandRevealEdge = 1.0 - smoothstep(0.0, 0.065, brandThreshold - brandField);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (brandNoise(vBrandPosition * 15.0) - 0.5) * 0.027, 0.08, 0.92);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float brandFresnel = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
        float brandSelection = 1.0 - smoothstep(0.0, 0.85, abs(uBrandFocus - uBrandPart));
        float brandSweepPosition = mix(-3.7, 3.7, clamp(uBrandEnergy * 0.8 + uBrandProgress * 0.2, 0.0, 1.0));
        float brandSweep = 1.0 - smoothstep(0.02, 0.28, abs(vBrandPosition.y + vBrandPosition.x * 0.18 - brandSweepPosition));
        float brandSweepStrength = 0.18 + 0.5 * uBrandEnergy + 0.24 * brandSelection;
        totalEmissiveRadiance += uBrandGold * (
          brandRevealEdge * (1.0 - uBrandAssembly) * 1.4 +
          brandSweep * brandSweepStrength * (0.12 + uBrandOpening * 0.2) +
          brandFresnel * (0.07 + uBrandEnergy * 0.17 + brandSelection * 0.08)
        );`);
    diagnostics.compilations += 1;
    diagnostics.parts.add(part);
  };
  material.customProgramCacheKey = () => 'gislaine-narrative-surface-v2';
}

export const contourParticleVertex = /* glsl */ `
uniform float uPixelRatio;
uniform float uPointSize;
uniform float uBrandFocus;
attribute float aBrandPart;
attribute float aPhase;
varying float vPart;
varying float vFocus;
varying float vPhase;
void main() {
  vPart = aBrandPart;
  vFocus = 1.0 - smoothstep(0.0, 1.0, abs(uBrandFocus - aBrandPart));
  vPhase = aPhase;
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(uPointSize * uPixelRatio * (11.0 / max(2.0, -viewPosition.z)) * (0.85 + vFocus * 0.3), 1.0, 8.0);
}
`;

export const contourParticleFragment = /* glsl */ `
uniform float uOpacity;
uniform float uBrandEnergy;
uniform vec3 uGold;
uniform vec3 uSage;
varying float vPart;
varying float vFocus;
varying float vPhase;
void main() {
  float radius = length(gl_PointCoord - vec2(0.5));
  float disc = 1.0 - smoothstep(0.18, 0.5, radius);
  if (disc < 0.03) discard;
  float pulse = 0.72 + 0.28 * cos((vPhase - uBrandEnergy) * 6.2831853);
  vec3 color = mix(uGold, uSage, step(1.5, vPart) * (1.0 - step(2.5, vPart)));
  gl_FragColor = vec4(color, disc * uOpacity * pulse * (0.72 + vFocus * 0.28));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

