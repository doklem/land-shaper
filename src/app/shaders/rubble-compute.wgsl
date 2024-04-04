<include noise>
<include mixedColor>
<include uvSection>

struct ShaderConfig {
    uvSection: UvSection,
    itemsDimensions: vec2f,
    meshSize: vec2f,
    scaleFactor: vec3f,
    color: MixedColor,
}

@group(0) @binding(0)
var displacementTexture: texture_2d<f32>;

@group(0) @binding(1)
var surfaceTexture: texture_2d<f32>;

@group(0)@binding(2)
var samplerLinearClamp: sampler;

@group(0) @binding(3)
var<uniform> config: ShaderConfig;

@group(0) @binding(4)
var<storage, read_write> matrices: array<mat4x4f>;

@group(0) @binding(5)
var<storage, read_write> colors: array<vec4f>;

fn fromEuler(euler: vec3f) -> vec4f {
  let sx = sin(euler.x);
  let cx = cos(euler.x);
  let sy = sin(euler.y);
  let cy = cos(euler.y);
  let sz = sin(euler.z);
  let cz = cos(euler.z);
  return vec4f(
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz);
}

fn compose(position: vec3f, quaternion: vec4f, scale: vec3f) -> mat4x4f {
	let x2 = quaternion.x + quaternion.x;
    let y2 = quaternion.y + quaternion.y;
    let z2 = quaternion.z + quaternion.z;
	let xx = quaternion.x * x2;
    let xy = quaternion.x * y2;
    let xz = quaternion.x * z2;
	let yy = quaternion.y * y2;
    let yz = quaternion.y * z2;
    let zz = quaternion.z * z2;
	let wx = quaternion.w * x2;
    let wy = quaternion.w * y2;
    let wz = quaternion.w * z2;
	return mat4x4f(
        (1. - (yy + zz)) * scale.x, (xy + wz) * scale.x, (xz - wy) * scale.x, 0.,
        (xy - wz) * scale.y, (1. - (xx + zz)) * scale.y, (yz + wx) * scale.y, 0.,
        (xz + wy) * scale.z, (yz - wx) * scale.z, (1. - (xx + yy)) * scale.z, 0.,
        position.x, position.y, position.z, 1.);
}

@compute @workgroup_size(64)
fn main(
    @builtin(global_invocation_id)
    global_invocation_id : vec3<u32>
) {
    if (global_invocation_id.x >= arrayLength(&matrices)) {
        return;
    }

    let globalId = f32(global_invocation_id.x);
    var gridPosition = vec2f(
        globalId % config.itemsDimensions.x,
        floor(globalId / config.itemsDimensions.x)
    ) + .5; // offset it to the middle of the gird slot.
    gridPosition += random3(vec3f(gridPosition, 0.)).xy;
    let gridUv = gridPosition / config.itemsDimensions;
    let uv = config.uvSection.offset + gridUv * config.uvSection.range;
    
    let vegetation = smoothstep(.8, .9, 1. - textureSampleLevel(surfaceTexture, samplerLinearClamp, uv, 0).y);
    let scale = vegetation * (random3(vec3f(uv, 1.)) + 1.5) * config.scaleFactor;
    let height = textureSampleLevel(displacementTexture, samplerLinearClamp, uv, 0).x;
    let rotation = random3(vec3f(uv, 2.));
    let position2d = config.meshSize * (uv - config.uvSection.offset);
    let position = vec3f(position2d, height);
    
    matrices[global_invocation_id.x] = compose(position, fromEuler(rotation), scale);
    colors[global_invocation_id.x] = getMixedColor(config.color, uv);
}