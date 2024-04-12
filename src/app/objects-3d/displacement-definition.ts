import { DataTexture } from 'three';

export interface IDisplacementDefinition {
    readonly displacementMap: DataTexture;
    readonly displacementRadius: Int32Array;
    readonly displacementMin: Int32Array;
    readonly displacementMax: Int32Array;
}