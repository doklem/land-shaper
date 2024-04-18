import { Color, FrontSide, Matrix4, Vector2, Vector3 } from 'three';
import { LightSettings } from '../settings/light-settings';
import { MixedColorSettings } from '../settings/mixed-color-settings';
import { SettingsIOHelper } from '../settings/settings-io-helper';
import { TemplateType } from '../settings/template-type';
import { ISettingsOptions } from '../settings/settings-options';

export class SettingsService implements ISettingsOptions {

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
        vegetation: new MixedColorSettings(),
        bedrock: new MixedColorSettings(),
        gravel: new MixedColorSettings(),
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

    public readonly normals = {
        seed: 0,
        octaves: 0,
        scale: new Vector2(),
        amplitude: 0,
    };

    public readonly ocean = {
        distortionScale: 0,
        size: 0,
        speed: 0,
        color: new Color(),
    };

    public readonly rubble = {
        scale: new Vector3(),
        slopStart: 0,
        slopRange: 0,
        color: new MixedColorSettings(),
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
            diffuse: this.diffuse,
            dropletErosion: this.dropletErosion,
            light: {
                ambient: this.light.ambient,
                azimuth: this.light.azimuth,
                directional: this.light.directional,
                elevation: this.light.elevation
            },
            normals: this.normals,
            ocean: this.ocean,
            rubble: this.rubble,
            sky: this.sky,
            thermalErosion: this.thermalErosion,
            topology: this.topology
        };
    }

    public set(options: ISettingsOptions): void {
        this.diffuse.bedrock.set(options.diffuse.bedrock);
        this.diffuse.gravel.set(options.diffuse.gravel);
        this.diffuse.riverRange = options.diffuse.riverRange;
        this.diffuse.riverStart = options.diffuse.riverStart;
        this.diffuse.shoreRange = options.diffuse.shoreRange;
        this.diffuse.shoreStart = options.diffuse.shoreStart;
        this.diffuse.slopRange = options.diffuse.slopRange;
        this.diffuse.shoreStart = options.diffuse.shoreStart;
        this.diffuse.slopRange = options.diffuse.slopRange;
        this.diffuse.slopStart = options.diffuse.slopStart;
        this.diffuse.vegetation.set(options.diffuse.vegetation);

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

        this.normals.amplitude = options.normals.amplitude;
        this.normals.octaves = options.normals.octaves;
        this.normals.scale.set(options.normals.scale.x, options.normals.scale.y);
        this.normals.seed = options.normals.seed;

        this.ocean.color.set(options.ocean.color);
        this.ocean.distortionScale = options.ocean.distortionScale;
        this.ocean.size = options.ocean.size;
        this.ocean.speed = options.ocean.speed;

        this.rubble.color.set(options.rubble.color);
        this.rubble.scale.set(options.rubble.scale.x, options.rubble.scale.y, options.rubble.scale.z);
        this.rubble.slopRange = options.rubble.slopRange;
        this.rubble.slopStart = options.rubble.slopStart;

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
