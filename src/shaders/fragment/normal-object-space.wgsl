<include uvSection>

struct ShaderConfig {
    uvSection: UvSection,
    texelSize: vec2f,
    gapLength: vec2f, // real world dimensions of a texel in meters.
}

@group(0) @binding(0)
var displacementTexture: texture_2d<f32>; // This needs to be sectioned

@group(0) @binding(1)
var bumpsTexture: texture_2d<f32>; // This is already sectioned

@group(0)@binding(2)
var samplerLinearClamp: sampler;

@group(0) @binding(3)
var<uniform> config: ShaderConfig;

fn getDisplacement(sectionUv: vec2f, uv: vec2f) -> f32 {
    return textureSample(displacementTexture, samplerLinearClamp, sectionUv).x
        + textureSample(bumpsTexture, samplerLinearClamp, uv).x;
}

fn getNormal(sectionUv: vec2f, uv: vec2f) -> vec3f {
    let northWest = getDisplacement(sectionUv, uv);
    let south = getDisplacement(sectionUv + vec2f(0., config.texelSize.y), uv);
    let east = getDisplacement(sectionUv + vec2f(config.texelSize.x, 0.), uv);

    let horizontal = vec3(config.gapLength.x, northWest - east, 0.);
    let vertical = vec3(0., south - northWest, config.gapLength.y);

    return normalize(cross(vertical, horizontal));
}

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    return vec4f(getNormal(applyUvSection(uv, config.uvSection), uv), 1.);
}