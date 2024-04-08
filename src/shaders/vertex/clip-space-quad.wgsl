struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn main(@location(0) pos: vec2f) -> VertexOutput {
    var output: VertexOutput;
    output.pos = vec4f(pos, 0., 1.);
    output.uv = pos * vec2f(.5, -0.5) + .5; // Clip space to UV
    return output;
}