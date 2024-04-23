<include noise>
<include mixedColor>
<include uvSection>

struct ShaderConfig {
    uvSection: UvSection,
    bedrockFlatNoRiverNoLake: MixedColor,
    bedrockFlatNoRiverLake: MixedColor,
    bedrockFlatRiverNoLake: MixedColor,
    bedrockFlatRiverLake: MixedColor,
    bedrockSlopeNoRiverNoLake: MixedColor,
    bedrockSlopeNoRiverLake: MixedColor,
    bedrockSlopeRiverNoLake: MixedColor,
    bedrockSlopeRiverLake: MixedColor,
    sedimentFlatNoRiverNoLake: MixedColor,
    sedimentFlatNoRiverLake: MixedColor,
    sedimentFlatRiverNoLake: MixedColor,
    sedimentFlatRiverLake: MixedColor,
    sedimentSlopeNoRiverNoLake: MixedColor,
    sedimentSlopeNoRiverLake: MixedColor,
    sedimentSlopeRiverNoLake: MixedColor,
    sedimentSlopeRiverLake: MixedColor,
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
    let height = textureSample(displacementTexture, samplerLinearClamp, sectionUv).x;

    let bedrockFlatNoRiverColor = mix(
        getMixedColorWithSeed(config.bedrockFlatNoRiverNoLake, sectionUv, height * config.bedrockFlatNoRiverNoLake.seed),
        getMixedColorWithSeed(config.bedrockFlatNoRiverLake, sectionUv, height * config.bedrockFlatNoRiverLake.seed),
        surface.a
    );
    let bedrockFlatRiverColor = mix(
        getMixedColorWithSeed(config.bedrockFlatRiverNoLake, sectionUv, height * config.bedrockFlatRiverNoLake.seed),
        getMixedColorWithSeed(config.bedrockFlatRiverLake, sectionUv, height * config.bedrockFlatRiverLake.seed),
        surface.a
    );
    let bedrockFlatColor = mix(bedrockFlatNoRiverColor, bedrockFlatRiverColor, surface.b);

    let bedrockSlopeNoRiverColor = mix(
        getMixedColorWithSeed(config.bedrockSlopeNoRiverNoLake, sectionUv, height * config.bedrockSlopeNoRiverNoLake.seed),
        getMixedColorWithSeed(config.bedrockSlopeNoRiverLake, sectionUv, height * config.bedrockSlopeNoRiverLake.seed),
        surface.a
    );
    let bedrockSlopeRiverColor = mix(
        getMixedColorWithSeed(config.bedrockSlopeRiverNoLake, sectionUv, height * config.bedrockSlopeRiverNoLake.seed),
        getMixedColorWithSeed(config.bedrockSlopeRiverLake, sectionUv, height * config.bedrockSlopeRiverLake.seed),
        surface.a
    );
    let bedrockSlopeColor = mix(bedrockSlopeNoRiverColor, bedrockSlopeRiverColor, surface.b);

    let bedrockColor = mix(bedrockFlatColor, bedrockSlopeColor, surface.g);

    let sedimentFlatNoRiverColor = mix(
        getMixedColor(config.sedimentFlatNoRiverNoLake, sectionUv),
        getMixedColor(config.sedimentFlatNoRiverLake, sectionUv),
        surface.a
    );
    let sedimentFlatRiverColor = mix(
        getMixedColor(config.sedimentFlatRiverNoLake, sectionUv),
        getMixedColor(config.sedimentFlatRiverLake, sectionUv),
        surface.a
    );
    let sedimentFlatColor = mix(sedimentFlatNoRiverColor, sedimentFlatRiverColor, surface.b);

    let sedimentSlopeNoRiverColor = mix(
        getMixedColor(config.sedimentSlopeNoRiverNoLake, sectionUv),
        getMixedColor(config.sedimentSlopeNoRiverLake, sectionUv),
        surface.a
    );
    let sedimentSlopeRiverColor = mix(
        getMixedColor(config.sedimentSlopeRiverNoLake, sectionUv),
        getMixedColor(config.sedimentSlopeRiverLake, sectionUv),
        surface.a
    );
    let sedimentSlopeColor = mix(sedimentSlopeNoRiverColor, sedimentSlopeRiverColor, surface.b);

    let sedimentColor = mix(sedimentFlatColor, sedimentSlopeColor, surface.g);
    
    return mix(bedrockColor, sedimentColor, surface.r);
    //return textureSample(debugTexture, samplerLinearClamp, uv);
}