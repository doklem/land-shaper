<include uvSection>

struct ShaderConfig {
    uvSection: UvSection,
    slopStart: f32,
    slopRange: f32,
    riverStart: f32,
    riverRange: f32,
    shoreStart: f32,
    shoreRange: f32,
    sedimentStart: f32,
    sedimentRange: f32
}

const UP: vec3f = vec3f(0., 1., 0.);

@group(0) @binding(0)
var normalTexture: texture_2d<f32>; // Already sectioned

@group(0) @binding(1)
var displacementTexture: texture_2d<f32>;

@group(0) @binding(2)
var displacementSedimentTexture: texture_2d<f32>;

@group(0) @binding(3)
var waterTexture: texture_2d<f32>;

@group(0)@binding(4)
var samplerLinearClamp: sampler;

@group(0) @binding(5)
var<uniform> config: ShaderConfig;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    let sectionUv = applyUvSection(uv, config.uvSection);
    let river = smoothstep(config.riverStart, config.riverStart + config.riverRange, textureSample(waterTexture, samplerLinearClamp, sectionUv).x);
    let shore = 1. - smoothstep(config.shoreStart, config.shoreStart + config.shoreRange, textureSample(displacementTexture, samplerLinearClamp, sectionUv).x);
    let sediment = smoothstep(config.sedimentStart, config.sedimentStart + config.sedimentRange, textureSample(displacementSedimentTexture, samplerLinearClamp, sectionUv).x);
    let normal = textureSample(normalTexture, samplerLinearClamp, uv).xyz;
    let slope = 1. - smoothstep(config.slopStart, config.slopStart + config.slopRange, dot(UP, normal));
    return vec4f(
        sediment, // gradient between bedrock and sediment
        slope, // gradient between flat and steep
        river, // gradient between dry and river
        shore, // gradient between dry and lake
    );
}