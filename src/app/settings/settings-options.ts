import { ColorRepresentation, Vector2Like, Vector3Like } from 'three';
import { IMixedColorOptions } from './mixed-color-options';
import { ILightOptions } from './light-options';

export interface ISettingsOptions {

    readonly diffuse: {
        slopStart: number;
        slopRange: number;
        riverStart: number;
        riverRange: number;
        shoreStart: number;
        shoreRange: number;
        vegetation: IMixedColorOptions;
        bedrock: IMixedColorOptions;
        gravel: IMixedColorOptions;
    };

    readonly dropletErosion: {
        iterations: number;
        maxLifetime: number;
        inertia: number;
        sedimentCapacityFactor: number;
        minSedimentCapacity: number;
        depositSpeed: number;
        erodeSpeed: number;
        evaporateSpeed: number;
        gravity: number;
        startSpeed: number;
        startWater: number;
    };

    readonly light: ILightOptions;

    readonly normals: {
        seed: number;
        octaves: number;
        scale: Vector2Like;
        amplitude: number;
    };

    readonly ocean: {
        distortionScale: number;
        size: number;
        speed: number;
        color: ColorRepresentation;
    };

    readonly rubble: {
        scale: Vector3Like;
        slopStart: number;
        slopRange: number;
        color: IMixedColorOptions;
    };

    readonly sky: {
        turbidity: number;
        rayleigh: number;
    };

    readonly thermalErosion: {
        amplitude: number;
        borderMin: Vector2Like,
        borderRange: Vector2Like,
        iterations: number;
        tanThreshold: number;
    };

    readonly topology: {
        octaves: number;
        offset: Vector3Like;
        ridgeThreshold: number;
        rotationAngle: number;
        rotationOffset: Vector2Like;
        scale: Vector3Like;
        seed: number;
        turbulence: Vector2Like;
    };
}