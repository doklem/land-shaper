import NoiseInclude from '../../shaders/include/noise.wgsl';
import MixedColorInclude from '../../shaders/include/mixed-color.wgsl';
import UvSectionInclude from '../../shaders/include/uv-section.wgsl';

export class ShaderUtils {
    public static applyIncludes(shader: string): string {
        return shader
            .replace('<include noise>', NoiseInclude)
            .replace('<include mixedColor>', MixedColorInclude)
            .replace('<include uvSection>', UvSectionInclude);
    }
}