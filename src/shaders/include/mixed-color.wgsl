struct MixedColor {
    colorA: vec4f,
    colorB: vec4f,
    seed: f32,
    octaves: i32,
    start: f32,
    range: f32,
    @align(16)scale: vec2f,
}

fn getMixedColorWithSeed(color: MixedColor, uv: vec2f, seed: f32) -> vec4f {
    return mix(
        color.colorA,
        color.colorB,
        smoothstep(
            color.start,
            color.start + color.range,
            snoiseFractal(vec3f(uv * color.scale, seed), color.octaves)
        )
    );
}

fn getMixedColor(color: MixedColor, uv: vec2f) -> vec4f {
    return getMixedColorWithSeed(color, uv, color.seed);
}
