struct ShaderConfig {
    brushSize: vec2i,
    strength: f32,
}

@group(0) @binding(0)
var displacementTexture: texture_2d<f32>;

@group(0)@binding(1)
var samplerLinearClamp: sampler;

@group(0) @binding(2)
var<uniform> config: ShaderConfig;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    let texelSize = vec2f(1., 1.) / vec2f(textureDimensions(displacementTexture));    
    var value = f32();
    var count = f32();
    for (var x = -config.brushSize.x; x < config.brushSize.x; x++) {
        for (var y = -config.brushSize.y; y < config.brushSize.y; y++) {
            value += textureSample(displacementTexture, samplerLinearClamp, uv + vec2f(f32(x), f32(y)) * texelSize).x;
            count += 1.;
        }
    }
    return mix(
        textureSample(displacementTexture, samplerLinearClamp, uv),
        vec4f(value / count, 0., 0., 1.),
        config.strength);
}