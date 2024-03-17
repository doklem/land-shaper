<include uvSection>

@group(0) @binding(0)
var inputTexture: texture_2d<f32>;

@group(0)@binding(1)
var floatSampler: sampler;

@group(0) @binding(2)
var<uniform> config: UvSection;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    return textureSample(inputTexture, floatSampler, applyUvSection(uv, config));
}