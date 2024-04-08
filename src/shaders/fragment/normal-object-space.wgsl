<include noise>
<include uvSection>

struct ShaderConfig {
    uvSection: UvSection,
    texelSize: vec2f,
    gapLength: vec2f, // real world dimensions of a texel in meters.
    bumpsScale: vec2f,
    bumpsSeed: f32,
    bumpsAmplitude: f32,
    bumpsOctaves: i32,
}

@group(0) @binding(0)
var displacementTexture: texture_2d<f32>;

@group(0)@binding(1)
var samplerLinearClamp: sampler;

@group(0) @binding(2)
var<uniform> config: ShaderConfig;

fn getDisplacement(uv: vec2f) -> f32 {
    let scaledUv = uv * config.bumpsScale;
    let bump = snoiseFractal(vec3f(scaledUv.x, scaledUv.y, config.bumpsSeed), config.bumpsOctaves) * config.bumpsAmplitude;
    return textureSample(displacementTexture, samplerLinearClamp, uv).r + bump;
}

fn getNormal(uv: vec2f) -> vec3f {
    let northWest = getDisplacement(uv);
    let south = getDisplacement(uv + vec2f(0., config.texelSize.y));
    let east = getDisplacement(uv + vec2f(config.texelSize.x, 0.));

    let horizontal = vec3(config.gapLength.x, northWest - east, 0.);
    let vertical = vec3(0., south - northWest, config.gapLength.y);

    return normalize(cross(vertical, horizontal));
}

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    return vec4f(getNormal(applyUvSection(uv, config.uvSection)), 1.);
}