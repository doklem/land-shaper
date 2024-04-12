
@group(0) @binding(0)
var displacementTexture: texture_2d<f32>;

@group(0)@binding(1)
var samplerLinearClamp: sampler;

@group(0) @binding(2)
var<storage, read_write> min: atomic<i32>;

@group(0) @binding(3)
var<storage, read_write> max: atomic<i32>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_invocation_id : vec3<u32>)
{
    var uv = vec2f(global_invocation_id.xy) / vec2f(textureDimensions(displacementTexture));    
    var height = textureSampleLevel(displacementTexture, samplerLinearClamp, uv, 0).x;
    atomicMin(&min, i32(floor(height)));
    atomicMax(&max, i32(ceil(height)));
}