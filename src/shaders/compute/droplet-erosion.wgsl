struct ShaderConfig {
    mapSize: vec2u,
    brushLength: i32,
    maxLifetime: u32,
    inertia: f32,
    sedimentCapacityFactor: f32,
    minSedimentCapacity: f32,
    depositSpeed: f32,
    erodeSpeed: f32,
    evaporateSpeed: f32,
    gravity: f32,
    startSpeed: f32,
    startWater: f32,
}

@group(0) @binding(0)
var<uniform> config: ShaderConfig;

@group(0) @binding(1)
var<storage, read> brush: array<f32>;

@group(0) @binding(2)
var<storage, read> origins: array<u32>;

@group(0) @binding(3)
var<storage, read> offsets: array<vec2f>;

@group(0) @binding(4)
var<storage, read_write> iterations: array<u32>;

//TODO: Use a read & write texture for this as soon as they are supported to allow bigger maps.
@group(0) @binding(5)
var<storage, read_write> bedrockMap: array<f32>;

@group(0) @binding(6)
var<storage, read_write> sedimentMap: array<f32>;

/*@group(0) @binding(6)
var debugTexture: texture_storage_2d<rgba32float, write>;*/

// Returns f32(gradientX, gradientY, height)
fn calculateHeightAndGradient(pos: vec2f) -> vec3f {
    let coord = vec2u(pos);

    // Calculate droplet's offset inside the cell (0,0) = at NW node, (1,1) = at SE node
    let x = pos.x - f32(coord.x);
    let y = pos.y - f32(coord.y);

    // Calculate heights of the four nodes of the droplet's cell
    let nodeIndexNW = coord.y * config.mapSize.x + coord.x;
    let nodeIndexNE = nodeIndexNW + 1;
    let nodeIndexSW = nodeIndexNW + config.mapSize.x;
    let nodeIndexSE = nodeIndexSW + 1;
    let heightNW = bedrockMap[nodeIndexNW] + sedimentMap[nodeIndexNW];
    let heightNE = bedrockMap[nodeIndexNE] + sedimentMap[nodeIndexNE];
    let heightSW = bedrockMap[nodeIndexSW] + sedimentMap[nodeIndexSW];
    let heightSE = bedrockMap[nodeIndexSE] + sedimentMap[nodeIndexSE];

    // Calculate droplet's direction of flow with linear interpolation of height difference along the edges
    let gradientX = mix(heightNE - heightNW, heightSE - heightSW, y);
    let gradientY = mix(heightSW - heightNW, heightSE - heightNE, x);

    // Calculate height with bilinear interpolation of the heights of the nodes of the cell
    let height = mix(mix(heightNW, heightNE, x), mix(heightSW, heightSE, x), y);

    return vec3f(gradientX, gradientY, height);
}

fn depositSediment(dropletIndex: u32, amountToDeposit: f32, cellOffsetX: f32, cellOffsetY: f32) {
    // Add the sediment to the four nodes of the current cell using bilinear interpolation
    // Deposition is not distributed over a radius (like erosion) so that it can fill small pits

    let dropletIndexNW = dropletIndex;
    let dropletIndexNE = dropletIndexNW + 1;
    let dropletIndexSW = dropletIndex + config.mapSize.x;
    let dropletIndexSE = dropletIndexSW + 1;

    sedimentMap[dropletIndexNW] += amountToDeposit * (1. - cellOffsetX) * (1. - cellOffsetY);
    sedimentMap[dropletIndexNE] += amountToDeposit * cellOffsetX * (1. - cellOffsetY);
    sedimentMap[dropletIndexSW] += amountToDeposit * (1. - cellOffsetX) * cellOffsetY;
    sedimentMap[dropletIndexSE] += amountToDeposit * cellOffsetX * cellOffsetY;
}

fn getCoordinates(index: u32) -> vec2u {
    return vec2u(index % config.mapSize.x, index / config.mapSize.x);
}

@compute @workgroup_size(64)
fn main(@builtin(local_invocation_id) invocation_id: vec3u)
{
    //let debugTextureRatio = vec2f(config.mapSize) / vec2f(textureDimensions(debugTexture));

    let mapSize = vec2i(config.mapSize);    
    let dropletId = invocation_id.x;
    let posIndex = origins[dropletId];
    let offsetIndex = iterations[dropletId];
    iterations[dropletId] = (offsetIndex + 1) % arrayLength(&offsets);
    var pos = vec2f(getCoordinates(posIndex)) + offsets[offsetIndex];
    var dir = vec2f();
    var speed = config.startSpeed;
    var water = config.startWater;
    var suspendedSediment = 0.;

    for (var lifetime = u32(); lifetime < config.maxLifetime; lifetime++) {

        let nodeX = u32(pos.x);
        let nodeY = u32(pos.y);
        let node = vec2i(pos);
        let dropletIndex = nodeY * config.mapSize.x + nodeX;
        // Calculate droplet's offset inside the cell (0,0) = at NW node, (1,1) = at SE node
        let cellOffsetX = pos.x - f32(nodeX);
        let cellOffsetY = pos.y - f32(nodeY);

        // Calculate droplet's height and direction of flow with bilinear interpolation of surrounding heights
        let heightAndGradient = calculateHeightAndGradient(pos);

        // Update the droplet's direction and position (move position 1 unit regardless of speed)
        dir = (dir * config.inertia - heightAndGradient.xy * (1. - config.inertia));
        // Normalize direction
        let len = max(0.01, sqrt(dir.x * dir.x + dir.y * dir.y));
        dir /= len;
        pos += dir;

        // Stop simulating droplet if it's not moving or has flowed over edge of map
        if ((dir.x == 0 && dir.y == 0)
            || pos.x < f32(config.brushLength)
            || pos.x > f32(i32(config.mapSize.x) - config.brushLength)
            || pos.y < f32(config.brushLength)
            || pos.y > f32(i32(config.mapSize.y) - config.brushLength)) {
            break;
        }

        // Find the droplet's new height and calculate the deltaHeight
        let newHeight = calculateHeightAndGradient(pos).z;
        let deltaHeight = newHeight - heightAndGradient.z;

        // Calculate the droplet's sediment capacity (higher when moving fast down a slope and contains lots of water)
        let sedimentCapacity = max(-deltaHeight * speed * water * config.sedimentCapacityFactor, config.minSedimentCapacity);
        
        // If carrying more sediment than capacity, or if flowing uphill:
        if (suspendedSediment > sedimentCapacity || deltaHeight > 0.) {
            // If moving uphill (deltaHeight > 0) try fill up to the current height, otherwise deposit a fraction of the excess sediment
            var amountToDeposit = f32();
            if (deltaHeight > 0.) {
                amountToDeposit = min(deltaHeight, suspendedSediment);
            } else {
                amountToDeposit = (suspendedSediment - sedimentCapacity) * config.depositSpeed;
            }

            suspendedSediment -= amountToDeposit;
            depositSediment(dropletIndex, amountToDeposit, cellOffsetX, cellOffsetY);
        } else {
            // Erode a fraction of the droplet's current carry capacity.
            // Clamp the erosion to the change in height so that it doesn't dig a hole in the terrain behind the droplet
            let amountToErode = min((sedimentCapacity - suspendedSediment) * config.erodeSpeed, -deltaHeight);

            for (var y = -config.brushLength; y <= config.brushLength; y++) {
                let erodeY = node.y + y;
                for (var x = -config.brushLength; x <= config.brushLength; x++) {
                    let erodeX = node.x + x;
                    let erodeIndex = erodeX + erodeY * mapSize.x;
                    let weight = brush[(x + config.brushLength) + (y + config.brushLength) * (config.brushLength * 2 + 1)];
                    var weightedErodeAmount = amountToErode * weight;
                    let sediment = sedimentMap[erodeIndex];
                    sedimentMap[erodeIndex] = max(0, sediment - weightedErodeAmount);
                    weightedErodeAmount = max(0, weightedErodeAmount - sediment);
                    bedrockMap[erodeIndex] -= weightedErodeAmount;
                    suspendedSediment += weightedErodeAmount;
                    //textureStore(debugTexture, vec2u(vec2f(node + vec2i(x, y)) / debugTextureRatio), vec4f(0., smoothstep(0., 1., weight * 10.), 1., 1.));
                }
            }
        }

        // Update droplet's speed and water content
        speed = sqrt(max(0, speed * speed + deltaHeight * config.gravity));
        water *= 1. - config.evaporateSpeed;
    }
}