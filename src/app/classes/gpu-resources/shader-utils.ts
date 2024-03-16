import NoiseInclude from './../../shaders/noise-include.wgsl';

export class ShaderUtils {

    public static applyIncludes(shader: string): string {
        return shader
            .replace('<include noise>', NoiseInclude);
    }
}