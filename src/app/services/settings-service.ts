import { Color, FrontSide, Matrix4, Vector2, Vector3 } from 'three';
import { LightSettings } from '../settings/light-settings';
import { MixedColorSettings } from '../settings/mixed-color-settings';
import { SettingsIOHelper } from '../settings/settings-io-helper';
import { TemplateType } from '../settings/template-type';
import { ISettingsOptions } from '../settings/settings-options';

export class SettingsService implements ISettingsOptions {

    public readonly bumps = {
        seed: 0,
        octaves: 0,
        scale: new Vector2(),
        amplitude: 0,
    };

    public readonly constants: {
        readonly anisotropy: number;
        readonly littleEndian: boolean;
        readonly meshSize: Vector2;
        readonly textureSizeTopology: Vector2;
        readonly vertexSizeTopology: Vector2;
        readonly textureSizeColors: Vector2;
        readonly textureSizeTerrain: Vector2;
        readonly vertexSizeFinalMaximum: Vector2;
        readonly vertexSizeFinalMinimum: Vector2;
        readonly meshLodDistance: number;
        readonly transformation: Matrix4;
        readonly sections: {
            readonly textureSizeTerrain: Vector2;
            readonly textureSizeColors: Vector2;
            readonly vertexSizeMaximum: Vector2;
            readonly uvRange: Vector2;
        };
        readonly dropletErosion: {
            readonly dropletsSize: Vector2;
            readonly dropletOffsetsMinSize: number;
            readonly dropletsWorkgroupCount: number;
            readonly brushRadius: number;
        };
        readonly rubble: {
            readonly dimensions: Vector2;
            readonly dimensionsSection: Vector2;
        };
        readonly ocean: {
            readonly textureSize: Vector2;
        }
    };

    public readonly debug = {
        side: FrontSide,
        wireframe: false,
    };

    public readonly diffuse = {
        slopStart: 0,
        slopRange: 0,
        riverStart: 0,
        riverRange: 0,
        shoreStart: 0,
        shoreRange: 0,
        sedimentStart: 0,
        sedimentRange: 0,
        bedrockFlatNoRiverNoLake: new MixedColorSettings(),
        bedrockFlatNoRiverLake: new MixedColorSettings(),
        bedrockFlatRiverNoLake: new MixedColorSettings(),
        bedrockFlatRiverLake: new MixedColorSettings(),
        bedrockSlopeNoRiverNoLake: new MixedColorSettings(),
        bedrockSlopeNoRiverLake: new MixedColorSettings(),
        bedrockSlopeRiverNoLake: new MixedColorSettings(),
        bedrockSlopeRiverLake: new MixedColorSettings(),
        sedimentFlatNoRiverNoLake: new MixedColorSettings(),
        sedimentFlatNoRiverLake: new MixedColorSettings(),
        sedimentFlatRiverNoLake: new MixedColorSettings(),
        sedimentFlatRiverLake: new MixedColorSettings(),
        sedimentSlopeNoRiverNoLake: new MixedColorSettings(),
        sedimentSlopeNoRiverLake: new MixedColorSettings(),
        sedimentSlopeRiverNoLake: new MixedColorSettings(),
        sedimentSlopeRiverLake: new MixedColorSettings(),
    };

    public readonly dropletErosion = {
        iterations: 0,
        maxLifetime: 0,
        inertia: 0,
        sedimentCapacityFactor: 0,
        minSedimentCapacity: 0,
        depositSpeed: 0,
        erodeSpeed: 0,
        evaporateSpeed: 0,
        gravity: 0,
        startSpeed: 0,
        startWater: 0,
    };

    public readonly light = new LightSettings();

    public readonly ocean = {
        distortionScale: 0,
        size: 0,
        speed: 0,
        color: new Color(),
    };

    public readonly rubble = {
        scale: new Vector3(),
        color: new MixedColorSettings(),
        sedimentStart: 0,
        sedimentRange: 0,
        slopeStart: 0,
        slopeRange: 0,
        riverStart: 0,
        riverRange: 0,
        lakeStart: 0,
        lakeRange: 0
    };

    public readonly sky = {
        turbidity: 0,
        rayleigh: 0,
    };

    public readonly thermalErosion = {
        amplitude: 0,
        borderMin: new Vector2(),
        borderRange: new Vector2(),
        iterations: 0,
        tanThreshold: 0,
    };

    public readonly topology = {
        octaves: 0,
        offset: new Vector3(),
        ridgeThreshold: 0,
        rotationAngle: 0,
        rotationOffset: new Vector2(),
        scale: new Vector3(),
        seed: 0,
        turbulence: new Vector2(),
    };

    constructor(anisotropy: number) {
        this.constants = {
            anisotropy,
            littleEndian: true,
            meshSize: new Vector2(512, 512),
            textureSizeTopology: new Vector2(64, 64),
            vertexSizeTopology: new Vector2(64, 64),
            textureSizeColors: new Vector2(4096, 4096),
            textureSizeTerrain: new Vector2(1024, 1024),
            vertexSizeFinalMaximum: new Vector2(1024, 1024),
            vertexSizeFinalMinimum: new Vector2(1, 1),
            meshLodDistance: 200,
            transformation: new Matrix4().makeRotationX(Math.PI * -0.5),
            sections: {
                textureSizeTerrain: new Vector2(64, 64),
                textureSizeColors: new Vector2(512, 512),
                vertexSizeMaximum: new Vector2(64, 64),
                uvRange: new Vector2(0.0625, 0.0625),
            },
            dropletErosion: {
                dropletsSize: new Vector2(8, 8),
                dropletOffsetsMinSize: 0.25,
                dropletsWorkgroupCount: 1,
                brushRadius: 4,
            },
            rubble: {
                dimensions: new Vector2(64, 64),
                dimensionsSection: new Vector2(4, 4),
            },
            ocean: {
                textureSize: new Vector2(512, 512),
            }
        };
        this.set(SettingsIOHelper.loadTemplate(TemplateType.temperate)!);
    }

    public get(): ISettingsOptions {
        return {
            bumps: this.bumps,
            diffuse: this.diffuse,
            dropletErosion: this.dropletErosion,
            light: {
                ambient: this.light.ambient,
                azimuth: this.light.azimuth,
                directional: this.light.directional,
                elevation: this.light.elevation
            },
            ocean: this.ocean,
            rubble: this.rubble,
            sky: this.sky,
            thermalErosion: this.thermalErosion,
            topology: this.topology
        };
    }

    public set(options: ISettingsOptions): void {
        this.bumps.amplitude = options.bumps.amplitude;
        this.bumps.octaves = options.bumps.octaves;
        this.bumps.scale.set(options.bumps.scale.x, options.bumps.scale.y);
        this.bumps.seed = options.bumps.seed;

        this.diffuse.riverRange = options.diffuse.riverRange;
        this.diffuse.riverStart = options.diffuse.riverStart;
        this.diffuse.shoreRange = options.diffuse.shoreRange;
        this.diffuse.shoreStart = options.diffuse.shoreStart;
        this.diffuse.slopRange = options.diffuse.slopRange;
        this.diffuse.shoreStart = options.diffuse.shoreStart;
        this.diffuse.slopRange = options.diffuse.slopRange;
        this.diffuse.slopStart = options.diffuse.slopStart;
        this.diffuse.sedimentRange = options.diffuse.sedimentRange;
        this.diffuse.sedimentStart = options.diffuse.sedimentStart;
        this.diffuse.bedrockFlatNoRiverNoLake.set(options.diffuse.bedrockFlatNoRiverNoLake);
        this.diffuse.bedrockFlatNoRiverLake.set(options.diffuse.bedrockFlatNoRiverLake);
        this.diffuse.bedrockFlatRiverNoLake.set(options.diffuse.bedrockFlatRiverNoLake);
        this.diffuse.bedrockFlatRiverLake.set(options.diffuse.bedrockFlatRiverLake);
        this.diffuse.bedrockSlopeNoRiverNoLake.set(options.diffuse.bedrockSlopeNoRiverNoLake);
        this.diffuse.bedrockSlopeNoRiverLake.set(options.diffuse.bedrockSlopeNoRiverLake);
        this.diffuse.bedrockSlopeRiverNoLake.set(options.diffuse.bedrockSlopeRiverNoLake);
        this.diffuse.bedrockSlopeRiverLake.set(options.diffuse.bedrockSlopeRiverLake);
        this.diffuse.sedimentFlatNoRiverNoLake.set(options.diffuse.sedimentFlatNoRiverNoLake);
        this.diffuse.sedimentFlatNoRiverLake.set(options.diffuse.sedimentFlatNoRiverLake);
        this.diffuse.sedimentFlatRiverNoLake.set(options.diffuse.sedimentFlatRiverNoLake);
        this.diffuse.sedimentFlatRiverLake.set(options.diffuse.sedimentFlatRiverLake);
        this.diffuse.sedimentSlopeNoRiverNoLake.set(options.diffuse.sedimentSlopeNoRiverNoLake);
        this.diffuse.sedimentSlopeNoRiverLake.set(options.diffuse.sedimentSlopeNoRiverLake);
        this.diffuse.sedimentSlopeRiverNoLake.set(options.diffuse.sedimentSlopeRiverNoLake);
        this.diffuse.sedimentSlopeRiverLake.set(options.diffuse.sedimentSlopeRiverLake);

        this.dropletErosion.depositSpeed = options.dropletErosion.depositSpeed;
        this.dropletErosion.erodeSpeed = options.dropletErosion.erodeSpeed;
        this.dropletErosion.evaporateSpeed = options.dropletErosion.evaporateSpeed;
        this.dropletErosion.gravity = options.dropletErosion.gravity;
        this.dropletErosion.inertia = options.dropletErosion.inertia;
        this.dropletErosion.iterations = options.dropletErosion.iterations;
        this.dropletErosion.maxLifetime = options.dropletErosion.maxLifetime;
        this.dropletErosion.minSedimentCapacity = options.dropletErosion.minSedimentCapacity;
        this.dropletErosion.sedimentCapacityFactor = options.dropletErosion.sedimentCapacityFactor;
        this.dropletErosion.startSpeed = options.dropletErosion.startSpeed;
        this.dropletErosion.startWater = options.dropletErosion.startWater;

        this.light.set(options.light);

        this.ocean.color.set(options.ocean.color);
        this.ocean.distortionScale = options.ocean.distortionScale;
        this.ocean.size = options.ocean.size;
        this.ocean.speed = options.ocean.speed;

        this.rubble.color.set(options.rubble.color);
        this.rubble.scale.set(options.rubble.scale.x, options.rubble.scale.y, options.rubble.scale.z);
        this.rubble.sedimentRange = options.rubble.sedimentRange;
        this.rubble.sedimentStart = options.rubble.sedimentStart;
        this.rubble.slopeRange = options.rubble.slopeRange;
        this.rubble.slopeStart = options.rubble.slopeStart;
        this.rubble.riverRange = options.rubble.riverRange;
        this.rubble.riverStart = options.rubble.riverStart;
        this.rubble.lakeRange = options.rubble.lakeRange;
        this.rubble.lakeStart = options.rubble.lakeStart;

        this.sky.rayleigh = options.sky.rayleigh;
        this.sky.turbidity = options.sky.turbidity;

        this.thermalErosion.amplitude = options.thermalErosion.amplitude;
        this.thermalErosion.borderMin.set(options.thermalErosion.borderMin.x, options.thermalErosion.borderMin.y);
        this.thermalErosion.borderRange.set(options.thermalErosion.borderRange.x, options.thermalErosion.borderRange.y);
        this.thermalErosion.iterations = options.thermalErosion.iterations;
        this.thermalErosion.tanThreshold = options.thermalErosion.tanThreshold;

        this.topology.octaves = options.topology.octaves;
        this.topology.offset.set(options.topology.offset.x, options.topology.offset.y, options.topology.offset.z);
        this.topology.ridgeThreshold = options.topology.ridgeThreshold;
        this.topology.rotationAngle = options.topology.rotationAngle;
        this.topology.rotationOffset.set(options.topology.rotationOffset.x, options.topology.rotationOffset.y);
        this.topology.scale.set(options.topology.scale.x, options.topology.scale.y, options.topology.scale.z);
        this.topology.seed = options.topology.seed;
        this.topology.turbulence.set(options.topology.turbulence.x, options.topology.turbulence.y);
    }
}
