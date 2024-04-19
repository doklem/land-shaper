struct ShaderConfig {
    mapSize: vec2i,
	borderMin: vec2f,
	borderMax: vec2f,
    amplitude: f32,
    tanThreshold: f32, //ToDo: Use different thresholds for bedrock and sediment.
}

const NEIGHBOUR_COUNT: i32 = 8;
const OFFSET_NW: vec2i = vec2i(-1, -1);
const OFFSET_N: vec2i = vec2i(0, -1);
const OFFSET_NE: vec2i = vec2i(1, -1);
const OFFSET_W: vec2i = vec2i(-1, 0);
const OFFSET_E: vec2i = vec2i(1, 0);
const OFFSET_SW: vec2i = vec2i(-1, 1);
const OFFSET_S: vec2i = vec2i(0, 1);
const OFFSET_SE: vec2i = vec2i(1, 1);

@group(0) @binding(0)
var<uniform> config: ShaderConfig;

@group(0) @binding(1)
var<storage, read> displacementBedrock: array<f32>;

@group(0) @binding(2)
var<storage, read> displacementSediment: array<f32>;

@group(0) @binding(3)
var<storage, read_write> displacementBedrockOut: array<f32>;

@group(0) @binding(4)
var<storage, read_write> displacementSedimentOut: array<f32>;

var<private> samples: array<f32,NEIGHBOUR_COUNT>;

fn toIndex(position: vec2i) -> i32
{
	return position.x + position.y * config.mapSize.x;
}

fn getNeighbourDelta(position: vec2i, neighbourOffset: vec2i, height: f32) -> f32
{
	var neighbourId = toIndex(position + neighbourOffset);
	return displacementBedrock[neighbourId] + displacementSediment[neighbourId] - height;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_invocation_id : vec3<u32>)
{
	// Get postion and height of current pixel	
    let position = vec2i(global_invocation_id.xy);
	let id = toIndex(position);
	let heightBedrock = displacementBedrock[id];
	let heightSediment = displacementSediment[id];
	let height = heightBedrock + heightSediment;
    
	// Sample a 3x3 grid around the pixel
	samples[0] = getNeighbourDelta(position, OFFSET_NW, height);
	samples[1] = getNeighbourDelta(position, OFFSET_N, height);
	samples[2] = getNeighbourDelta(position, OFFSET_NE, height);
	samples[3] = getNeighbourDelta(position, OFFSET_W, height);
	samples[4] = getNeighbourDelta(position, OFFSET_E, height);
	samples[5] = getNeighbourDelta(position, OFFSET_SW, height);
	samples[6] = getNeighbourDelta(position, OFFSET_S, height);
	samples[7] = getNeighbourDelta(position, OFFSET_SE, height);
		
	// Check stability with all neighbours
	var newHeightSediment = heightSediment;
	for (var i = 0; i < NEIGHBOUR_COUNT; i++)
	{
		let neighbourDelta = samples[i];
		if (abs(neighbourDelta) > config.tanThreshold) {
			newHeightSediment += neighbourDelta * config.amplitude;
		}
	}

	// Blend with border
	let blend = min(smoothstep(
			config.borderMin,
			config.borderMax,
			vec2f(global_invocation_id.xy)),
		1. - smoothstep(
			vec2f(config.mapSize) - config.borderMax,
			vec2f(config.mapSize) - config.borderMin,
			vec2f(global_invocation_id.xy)));
	var border = min(blend.x, blend.y);

	// Add/Remove matter if necessary
	displacementSedimentOut[id] = mix(heightSediment, max(0, newHeightSediment), border);
	displacementBedrockOut[id] = mix(heightBedrock, heightBedrock + min(0, newHeightSediment), border);
}