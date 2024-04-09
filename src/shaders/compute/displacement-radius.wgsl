@group(0) @binding(0)
var<uniform> meshSize: vec2f;

@group(0) @binding(1)
var displacementTexture: texture_2d<f32>;

@group(0)@binding(2)
var samplerLinearClamp: sampler;

@group(0) @binding(3)
var<storage, read> min: i32;

@group(0) @binding(4)
var<storage, read> max: i32;

@group(0) @binding(5)
var<storage, read_write> radius: atomic<i32>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_invocation_id : vec3<u32>)
{
    var center = vec3f(meshSize.x, meshSize.y, f32(min + max)) * .5;
    var uv = vec2f(global_invocation_id.xy) / vec2f(textureDimensions(displacementTexture));
    var position = vec3f(meshSize * uv, textureSampleLevel(displacementTexture, samplerLinearClamp, uv, 0).x);
    atomicMax(&radius, i32(ceil(distance(center, position))));
}