<include noise>
<include mixedColor>
<include uvSection>

struct ShaderConfig {
    uvSection: UvSection,
    vegetation: MixedColor,
    bedrock: MixedColor,
    gravel: MixedColor,
}

@group(0) @binding(0)
var surfaceTexture: texture_2d<f32>;

@group(0) @binding(1)
var displacementTexture: texture_2d<f32>;

@group(0)@binding(2)
var samplerLinearClamp: sampler;

@group(0) @binding(3)
var<uniform> config: ShaderConfig;

/*@group(0) @binding(4)
var debugTexture: texture_2d<f32>;*/

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    let sectionUv = applyUvSection(uv, config.uvSection);
    let surface = textureSample(surfaceTexture, samplerLinearClamp, uv);
    let gravelColor = getMixedColor(config.gravel, sectionUv);
    let bedrockColor = getMixedColorWithSeed(config.bedrock, sectionUv, textureSample(displacementTexture, samplerLinearClamp, sectionUv).r * config.bedrock.seed);
    let dirtColor = mix(gravelColor, bedrockColor, surface.r);
    let vegetationColor = getMixedColor(config.vegetation, sectionUv);
    return mix(dirtColor, vegetationColor, surface.g);
    //return textureSample(debugTexture, samplerLinearClamp, uv);
}