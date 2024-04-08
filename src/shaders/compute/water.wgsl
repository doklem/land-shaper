struct ShaderConfig {
    mapSize: vec2u,
    maxLifetime: u32,
    inertia: f32,
    evaporateSpeed: f32,
    gravity: f32,
    startSpeed: f32,
    startWater: f32,
}

@group(0) @binding(0)
var<uniform> config: ShaderConfig;

@group(0) @binding(1)
var<storage, read> origins: array<u32>;

@group(0) @binding(2)
var<storage, read> offsets: array<vec2f>;

@group(0) @binding(3)
var<storage, read_write> iterations: array<u32>;

@group(0) @binding(4)
var displacementTexture: texture_2d<f32>;

@group(0)@binding(5)
var samplerLinearClamp: sampler;

//TODO: Use a read & write texture for this as soon as they are supported to allow bigger maps.
@group(0) @binding(6)
var<storage, read_write> waters: array<f32>;

// Returns f32(gradientX, gradientY, height)
fn calculateHeightAndGradient(position: vec2f) -> vec3f {
    let positionNW = floor(position);
    let mapSize = vec2f(config.mapSize);

    // Calculate droplet's offset inside the cell (0,0) = at NW node, (1,1) = at SE node
    let offset = position - positionNW;

    // Calculate heights of the four nodes of the droplet's cell
    let uv = position / mapSize;
    let uvNW = positionNW / mapSize;
    let uvNE = (positionNW + vec2f(1., 0.)) / mapSize;
    let uvSW = (positionNW + vec2f(0., 1.)) / mapSize;
    let uvSE = (positionNW + vec2f(1., 1.)) / mapSize;
    let heightNW = textureSampleLevel(displacementTexture, samplerLinearClamp, uvNW, 0.).x;
    let heightNE = textureSampleLevel(displacementTexture, samplerLinearClamp, uvNE, 0.).x;
    let heightSW = textureSampleLevel(displacementTexture, samplerLinearClamp, uvSW, 0.).x;
    let heightSE = textureSampleLevel(displacementTexture, samplerLinearClamp, uvSE, 0.).x;

    // Calculate droplet's direction of flow with linear interpolation of height difference along the edges
    let gradientX = mix(heightNE - heightNW, heightSE - heightSW, offset.y);
    let gradientY = mix(heightSW - heightNW, heightSE - heightNE, offset.x);

    // Calculate height with bilinear interpolation of the heights of the nodes of the cell
    let height = textureSampleLevel(displacementTexture, samplerLinearClamp, uv, 0.).x;

    return vec3f(gradientX, gradientY, height);
}

fn paintWater(dropletIndex: u32, water: f32, cellOffsetX: f32, cellOffsetY: f32) {
    // Add the water to the four nodes of the current cell using bilinear interpolation

    let dropletIndexNW = dropletIndex;
    let dropletIndexNE = dropletIndexNW + 1;
    let dropletIndexSW = dropletIndex + config.mapSize.x;
    let dropletIndexSE = dropletIndexSW + 1;

    let depositNW = water * (1. - cellOffsetX) * (1. - cellOffsetY);
    let depositNE = water * cellOffsetX * (1. - cellOffsetY);
    let depositSW = water * (1. - cellOffsetX) * cellOffsetY;
    let depositSE = water * cellOffsetX * cellOffsetY;

    waters[dropletIndexNW] += depositNW;
    waters[dropletIndexNE] += depositNE;
    waters[dropletIndexSW] += depositSW;
    waters[dropletIndexSE] += depositSE;
}

fn getCoordinates(index: u32) -> vec2u {
    return vec2u(index % config.mapSize.x, index / config.mapSize.x);
}

@compute @workgroup_size(64)
fn main(@builtin(local_invocation_id) local_invocation_id: vec3u)
{
    let dropletId = local_invocation_id.x;
    let posIndex = origins[dropletId];
    let offsetIndex = iterations[dropletId];
    iterations[dropletId] = (offsetIndex + 1) % arrayLength(&offsets);
    var pos = vec2f(getCoordinates(posIndex)) + offsets[offsetIndex];
    var dir = vec2f();
    var speed = config.startSpeed;
    var water = config.startWater;
    var oldWater = water;

    for (var lifetime = u32(); lifetime < config.maxLifetime; lifetime++) {

        let nodeX = u32(pos.x);
        let nodeY = u32(pos.y);
        let dropletIndex = nodeY * config.mapSize.x + nodeX;
        // Calculate droplet's offset inside the cell (0,0) = at NW node, (1,1) = at SE node
        let cellOffsetX = pos.x - f32(nodeX);
        let cellOffsetY = pos.y - f32(nodeY);
        
        // Calculate droplet's height and direction of flow with bilinear interpolation of surrounding heights
        let heightAndGradient = calculateHeightAndGradient(pos);

        // Update the droplet's direction and position (move position 1 unit regardless of speed)
        dir.x = (dir.x * config.inertia - heightAndGradient.x * (1. - config.inertia));
        dir.y = (dir.y * config.inertia - heightAndGradient.y * (1. - config.inertia));
        // Normalize direction
        let len = max(0.01, sqrt(dir.x * dir.x + dir.y * dir.y));
        dir /= len;
        pos += dir;

        // Stop simulating droplet if it's not moving or has flowed over edge of map
        if ((dir.x == 0 && dir.y == 0)
            || pos.x < 0.
            || pos.x > f32(config.mapSize.x)
            || pos.y < 0.
            || pos.y > f32(config.mapSize.y)) {
            break;
        }

        // Find the droplet's new height and calculate the deltaHeight
        let newHeight = calculateHeightAndGradient(pos).z;
        let deltaHeight = newHeight - heightAndGradient.z;

        // Update droplet's speed and water content
        speed = sqrt(max(0, speed * speed + deltaHeight * config.gravity));        
        water *= 1. - config.evaporateSpeed;

        paintWater(dropletIndex, oldWater - water, cellOffsetX, cellOffsetY);
        oldWater = water;
    }
}