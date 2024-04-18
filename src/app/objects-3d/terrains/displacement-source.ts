import { Texture } from 'three';

export interface IDisplacementSource {
    readonly displacementMap: Texture;
    readonly displacementRadius: Int32Array;
    readonly displacementMin: Int32Array;
    readonly displacementMax: Int32Array;
}