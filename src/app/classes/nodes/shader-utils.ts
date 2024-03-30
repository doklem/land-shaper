import NoiseInclude from './../../shaders/noise-include.wgsl';
import MixedColorInclude from './../../shaders/mixed-color-include.wgsl';
import UvSectionInclude from './../../shaders/uv-section-include.wgsl';

export class ShaderUtils {
    public static applyIncludes(shader: string): string {
        return shader
            .replace('<include noise>', NoiseInclude)
            .replace('<include mixedColor>', MixedColorInclude)
            .replace('<include uvSection>', UvSectionInclude);
    }
}