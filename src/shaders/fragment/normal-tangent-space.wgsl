@group(0) @binding(0)
var normalTexture: texture_2d<f32>;

@group(0)@binding(1)
var samplerLinearClamp: sampler;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{    
    let normal = textureSample(normalTexture, samplerLinearClamp, uv);
    // Convert from object space to tangent space
    let color = normalize((vec3f(-normal.x, -normal.z, normal.y) + 1.) * .5);
    return vec4f(color, 1.);
}