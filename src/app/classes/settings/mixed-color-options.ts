import { ColorRepresentation, Vector2Like } from 'three';

export interface IMixedColorOptions {
    colorA: ColorRepresentation;
    colorB: ColorRepresentation;
    seed: number;
    octaves: number;
    start: number;
    range: number;
    scale: Vector2Like;
}