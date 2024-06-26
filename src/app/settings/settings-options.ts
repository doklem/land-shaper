import { ColorRepresentation, Vector2Like, Vector3Like } from 'three';
import { IMixedColorOptions } from './mixed-color-options';
import { ILightOptions } from './light-options';

export interface ISettingsOptions {

    readonly bumps: {
        seed: number;
        octaves: number;
        scale: Vector2Like;
        amplitude: number;
    };

    readonly diffuse: {
        slopStart: number;
        slopRange: number;
        riverStart: number;
        riverRange: number;
        shoreStart: number;
        shoreRange: number;
        sedimentStart: number;
        sedimentRange: number;
        bedrockFlatNoRiverNoLake: IMixedColorOptions;
        bedrockFlatNoRiverLake: IMixedColorOptions;
        bedrockFlatRiverNoLake: IMixedColorOptions;
        bedrockFlatRiverLake: IMixedColorOptions;
        bedrockSlopeNoRiverNoLake: IMixedColorOptions;
        bedrockSlopeNoRiverLake: IMixedColorOptions;
        bedrockSlopeRiverNoLake: IMixedColorOptions;
        bedrockSlopeRiverLake: IMixedColorOptions;
        sedimentFlatNoRiverNoLake: IMixedColorOptions;
        sedimentFlatNoRiverLake: IMixedColorOptions;
        sedimentFlatRiverNoLake: IMixedColorOptions;
        sedimentFlatRiverLake: IMixedColorOptions;
        sedimentSlopeNoRiverNoLake: IMixedColorOptions;
        sedimentSlopeNoRiverLake: IMixedColorOptions;
        sedimentSlopeRiverNoLake: IMixedColorOptions;
        sedimentSlopeRiverLake: IMixedColorOptions;
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

    readonly ocean: {
        distortionScale: number;
        size: number;
        speed: number;
        color: ColorRepresentation;
    };

    readonly rubble: {
        scale: Vector3Like;
        color: IMixedColorOptions;
        sedimentStart: number;
        sedimentRange: number;
        slopeStart: number;
        slopeRange: number;
        riverStart: number;
        riverRange: number;
        lakeStart: number;
        lakeRange: number;
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