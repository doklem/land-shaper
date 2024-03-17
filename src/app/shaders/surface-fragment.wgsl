<include uvSection>

struct ShaderConfig {
    uvSection: UvSection,
    slopStart: f32,
    slopRange: f32,
    riverStart: f32,
    riverRange: f32,
    shoreStart: f32,
    shoreRange: f32
}

const UP: vec3f = vec3f(0., 1., 0.);

@group(0) @binding(0)
var normalTexture: texture_2d<f32>;

@group(0) @binding(1)
var displacementTexture: texture_2d<f32>;

@group(0) @binding(2)
var waterTexture: texture_2d<f32>;

@group(0)@binding(3)
var floatSampler: sampler;

@group(0) @binding(4)
var<uniform> config: ShaderConfig;

fn getSlopeGradient(uv: vec2f) -> f32 {
    let normal = textureSample(normalTexture, floatSampler, uv).xyz;
    return smoothstep(config.slopStart, config.slopStart + config.slopRange, dot(UP, normal));
}

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    let sectionUv = applyUvSection(uv, config.uvSection);
    let shore = smoothstep(config.shoreStart, config.shoreStart + config.shoreRange, textureSample(displacementTexture, floatSampler, sectionUv).x);
    let river = 1. - smoothstep(config.riverStart, config.riverStart + config.riverRange, textureSample(waterTexture, floatSampler, sectionUv).x);
    let dirt = min(shore, river);
    return vec4f(
        dirt, // gradient of dirt type between gravel and bedrock
        min(dirt, getSlopeGradient(uv)), // gradient between dirt and vegetation
        0.,
        0,
    );
}