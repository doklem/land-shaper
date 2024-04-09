import { DataTexture } from 'three';

export interface IDisplacementDefinition {
    readonly displacementMap: DataTexture;
    readonly displacementRadius: Int32Array[];
    readonly displacementRange: Int32Array[];
}