@group(0) @binding(0)
var inputTextureA: texture_2d<f32>;

@group(0) @binding(1)
var inputTextureB: texture_2d<f32>;

@group(0)@binding(2)
var samplerLinearClamp: sampler;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    return textureSample(inputTextureA, samplerLinearClamp, uv)
        + textureSample(inputTextureB, samplerLinearClamp, uv);
}