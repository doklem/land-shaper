struct UvSection {
    offset: vec2f,
    range: vec2f,
}

fn applyUvSection(uv: vec2f, section: UvSection) -> vec2f
{
    return section.offset + uv * section.range;
}