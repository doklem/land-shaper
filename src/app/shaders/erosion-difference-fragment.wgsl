const BLUE: vec4f = vec4f(0., 0., 1., 1.);
const CYAN: vec4f = vec4f(0., 1., 1., 1.);
const FULL_RANGE: f32 = 2.;
const MID_RANGE: f32 = 0.2;
const ORANGE: vec4f = vec4f(1., 0.65, 0., 1.);
const RED: vec4f = vec4f(1., 0., 0., 1.);
const WHITE: vec4f = vec4f(1., 1., 1., 1.);

@group(0) @binding(0)
var displacementOriginalTexture: texture_2d<f32>;

@group(0) @binding(1)
var displacementErodedTexture: texture_2d<f32>;

@group(0)@binding(2)
var floatSampler: sampler;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    var difference = textureSample(displacementErodedTexture, floatSampler, uv).x - textureSample(displacementOriginalTexture, floatSampler, uv).x;

    var erodedShadeColor = mix(RED, ORANGE, smoothstep(-FULL_RANGE, -MID_RANGE, difference));
    var erodedColor = mix(erodedShadeColor, WHITE, smoothstep(-MID_RANGE, 0., difference));

    var dipositedShadeColor = mix(CYAN, BLUE, smoothstep(MID_RANGE, FULL_RANGE, difference));
    var dipositedColor = mix(WHITE, dipositedShadeColor, smoothstep(0., MID_RANGE, difference));

    return mix(erodedColor, dipositedColor, smoothstep(-FULL_RANGE, FULL_RANGE, difference));
}