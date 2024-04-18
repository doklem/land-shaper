struct ShaderConfig {
    mapSize: vec2i,
	borderMin: vec2f,
	borderMax: vec2f,
    amplitude: f32,
    tanThreshold: f32,
}

const NEIGHBOUR_COUNT: i32 = 8;

@group(0) @binding(0)
var<uniform> config: ShaderConfig;

@group(0) @binding(1)
var<storage, read> displacement: array<f32>;

@group(0) @binding(2)
var<storage, read_write> displacementOut: array<f32>;

var<private> samples: array<f32,NEIGHBOUR_COUNT>;

fn toIndex(position: vec2i) -> i32
{
	return position.x + position.y * config.mapSize.x;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_invocation_id : vec3<u32>)
{	
	// Blend border
	let blend = min(smoothstep(
			config.borderMin,
			config.borderMax,
			vec2f(global_invocation_id.xy)),
		1. - smoothstep(
			vec2f(config.mapSize) - config.borderMax,
			vec2f(config.mapSize) - config.borderMin,
			vec2f(global_invocation_id.xy)));
    
	// Sample a 3x3 grid around the pixel
    let position = vec2i(global_invocation_id.xy);
	let id = toIndex(position);
	let height = displacement[id];
	samples[0] = displacement[toIndex(position + vec2i(-1, -1))] - height; //north west
	samples[1] = displacement[toIndex(position + vec2i(0, -1))] - height; //north
	samples[2] = displacement[toIndex(position + vec2i(1, -1))] - height; //north east
	samples[3] = displacement[toIndex(position + vec2i(-1, 0))] - height; //west
	samples[4] = displacement[toIndex(position + vec2i(1, 0))] - height; //east
	samples[5] = displacement[toIndex(position + vec2i(-1, 1))] - height; //south west
	samples[6] = displacement[toIndex(position + vec2i(0, 1))] - height; //south
	samples[7] = displacement[toIndex(position + vec2i(1, 1))] - height; //south east
		
	// Check stability with all neighbours
	var recevie = 0.;
	var distribute = 0.;
	for (var i = 0; i < NEIGHBOUR_COUNT; i++)
	{
		let delta = samples[i];
		if (delta > config.tanThreshold) {
			recevie += delta * config.amplitude;
		} else if (delta < config.tanThreshold) {
			distribute += delta * config.amplitude;
		}
	}

	// Add/Remove matter if necessary
	displacementOut[id] = mix(height, height + recevie + distribute, min(blend.x, blend.y));
}