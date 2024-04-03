<include noise>

// The order of the fields does matter because of the byte padding.
struct ShaderConfig {
    origin: vec3f,
    seed: f32,
    scale: vec3f,
    octaveCount: i32,
    turbulence: vec2f,
    meshSize: vec2f,
    ridgeThreshold: f32,
}

@group(0) @binding(0)
var<uniform> config: ShaderConfig;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    // Get the local X and Y coordinate.
    let localCoordinate = uv * config.meshSize;

    // Translate and scale the X and Y coordinate.
    var coordinate = vec3f((config.origin.xy + localCoordinate) * config.scale.xy, 0.);

    // Apply turbulence.
    coordinate = coordinate
        + vec3f(
            snoise(vec3f(coordinate.x, coordinate.y, config.seed + 1.)),
            snoise(vec3f(coordinate.x, coordinate.y, config.seed + 2.)),
            0.)
        * vec3f(config.turbulence, 0.);

    // Calculate Z coordinate.
    return vec4f(
        ridgedNoiseFractal(
            vec3f(coordinate.xy, config.seed),
            config.octaveCount,
            config.ridgeThreshold) * config.scale.z + config.origin.z,
        0.,
        0.,
        1.);
}