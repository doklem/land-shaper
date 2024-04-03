import { ColorRepresentation } from 'three';

export interface ILightOptions {
    azimuth: number;
    ambient: ColorRepresentation;
    directional: ColorRepresentation;
    elevation: number;
}