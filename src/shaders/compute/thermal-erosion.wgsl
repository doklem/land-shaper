struct ShaderConfig {
    mapSize: vec2i,
	borderMin: vec2f,
	borderMax: vec2f,
    amplitude: f32,
    tanThreshold: f32, //ToDo: Use different thresholds for bedrock and sediment.
}

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

fn toIndex(position: vec2i) -> i32
{
	return position.x + position.y * config.mapSize.x;
}

fn getNeighbourDelta(position: vec2i, neighbourOffset: vec2i, height: f32) -> f32
{
	let neighbourId = toIndex(position + neighbourOffset);
	let delta = displacementBedrock[neighbourId] + displacementSediment[neighbourId] - height;
	return delta * step(config.tanThreshold, abs(delta)) * config.amplitude;
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
    
	// Sample a 3x3 grid around the pixel and check stability with each neighbour
	var newHeightSediment = heightSediment;
	newHeightSediment += getNeighbourDelta(position, OFFSET_NW, height);
	newHeightSediment += getNeighbourDelta(position, OFFSET_N, height);
	newHeightSediment += getNeighbourDelta(position, OFFSET_NE, height);
	newHeightSediment += getNeighbourDelta(position, OFFSET_W, height);
	newHeightSediment += getNeighbourDelta(position, OFFSET_E, height);
	newHeightSediment += getNeighbourDelta(position, OFFSET_SW, height);
	newHeightSediment += getNeighbourDelta(position, OFFSET_S, height);
	newHeightSediment += getNeighbourDelta(position, OFFSET_SE, height);

	// Blend with border
	let blend = min(smoothstep(
			config.borderMin,
			config.borderMax,
			vec2f(global_invocation_id.xy)),
		1. - smoothstep(
			vec2f(config.mapSize) - config.borderMax,
			vec2f(config.mapSize) - config.borderMin,
			vec2f(global_invocation_id.xy)));
	let border = min(blend.x, blend.y);

	// Add/Remove matter if necessary
	displacementSedimentOut[id] = mix(heightSediment, max(0, newHeightSediment), border);
	displacementBedrockOut[id] = mix(heightBedrock, heightBedrock + min(0, newHeightSediment), border);
}