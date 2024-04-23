<include noise>
<include uvSection>

struct ShaderConfig {
    uvSection: UvSection,
    bumpsScale: vec2f,
    bumpsSeed: f32,
    bumpsAmplitude: f32,
    bumpsOctaves: i32,
}

@group(0) @binding(0)
var<uniform> config: ShaderConfig;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    let sectionUv = applyUvSection(uv, config.uvSection);
    let bump = snoiseFractal(vec3f(sectionUv.xy * config.bumpsScale, config.bumpsSeed), config.bumpsOctaves) * config.bumpsAmplitude;
    return vec4f(bump, 0., 0., 0.);
}