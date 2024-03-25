import { Color, Matrix4, Vector2, Vector3 } from 'three';
import { LightSettings } from './light-settings';
import { MixedColorSettings } from './mixed-color-settings';
import { GUI } from 'lil-gui';
import temperateTemplate from './temperate-template.json';
import desertTemplate from './desert-template.json';
import { TemplateType } from './template-type';

export class SettingsManager {

    private static readonly JSON_MIME_TYPE: MIMEType = 'application/json';
    private static readonly JSON_FILE_EXTENSION: FileExtension = '.json';
    private static readonly PICKER_ACCEPT_TYPES: FilePickerAcceptType[] = [
        {
            description: 'JSON File',
            accept: {
                'application/json': [SettingsManager.JSON_FILE_EXTENSION],
            },
        },
    ];
    private static readonly OPEN_PICKER_OPTIONS: OpenFilePickerOptions = {
        types: SettingsManager.PICKER_ACCEPT_TYPES,
        excludeAcceptAllOption: true,
        multiple: false,
    };
    private static readonly SAVE_PICKER_OPTIONS: SaveFilePickerOptions = {
        suggestedName: `land-shaper-settings${SettingsManager.JSON_FILE_EXTENSION}`,
        types: SettingsManager.PICKER_ACCEPT_TYPES,
    };

    public readonly blur = {
        size: new Vector2(2, 2),
        strength: 0.5,
    };

    public readonly constants: {
        readonly anisotropy: number;
        readonly littleEndian: boolean;
        readonly meshSize: Vector2;
        readonly textureSizeDraft: Vector2;
        readonly vertexSizeDraft: Vector2;
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
        readonly erosion: {
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
        wireframe: false,
    };

    public readonly diffuse = {
        slopStart: 0.85,
        slopRange: 0.05,
        riverStart: 20,
        riverRange: 30,
        shoreStart: 3,
        shoreRange: 0.2,
        vegetation: new MixedColorSettings(
            new Color(0.059, 0.118, 0.039),
            new Color(0.212, 0.302, 0),
            0,
            2,
            -1,
            2,
            new Vector2(50, 50)),
        bedrock: new MixedColorSettings(
            new Color(1, 1, 1),
            new Color(0.3, 0.3, 0.3),
            0.7,
            1,
            -0.75,
            1.5,
            new Vector2(8, 8)),
        gravel: new MixedColorSettings(
            new Color(1, 1, 1),
            new Color(0.3, 0.3, 0.3),
            0,
            1,
            -1,
            2,
            new Vector2(500, 500)),
    };

    public readonly erosion = {
        iterations: 1000,
        maxLifetime: 50,
        inertia: 0.05,
        sedimentCapacityFactor: 4,
        minSedimentCapacity: 0.1,
        depositSpeed: 0.2,
        erodeSpeed: 0.2,
        evaporateSpeed: 0.1,
        gravity: 9.807,
        startSpeed: 1,
        startWater: 1,
    };

    public readonly light = new LightSettings(
        45,
        92,
        new Color(0.604, 0.784, 0.874),
        new Color(1, 1, 1));

    public readonly normals = {
        seed: 0,
        octaves: 3,
        scale: new Vector2(1000, 1000),
        amplitude: 0.03,
    };

    public readonly ocean = {
        distortionScale: 3.7,
        waterSize: 10,
        waterSpeed: 0.0005,
        color: new Color(0, 0.118, 0.059),
    };

    public readonly rubble = {
        scaleFactor: new Vector3(.5, .5, .5),
        slopStart: 0.7,
        slopRange: 0.1,
        color: new MixedColorSettings(
            new Color(0.53, 0.53, 0.53),
            new Color(0.86, 0.86, 0.86),
            0,
            1,
            -0.25,
            0.5,
            new Vector2(10, 10)),
    };

    public readonly sky = {
        turbidity: 0.1,
        rayleigh: 0.1,
    };

    public readonly topology = {
        offset: new Vector3(-243.89, -211.03, -49.5),
        scale: new Vector3(0.0025, 0.0025, 82.25),
        seed: 0,
        turbulence: new Vector2(0.2, 0.2),
        octaveCount: 9,
        ridgeThreshold: 0,
    };

    constructor(anisotropy: number) {
        this.constants = {
            anisotropy,
            littleEndian: true,
            meshSize: new Vector2(512, 512),
            textureSizeDraft: new Vector2(64, 64),
            vertexSizeDraft: new Vector2(64, 64),
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
            erosion: {
                dropletsSize: new Vector2(8, 8),
                dropletOffsetsMinSize: 1,
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
    }

    public async loadTemplate(gui: GUI, template: TemplateType): Promise<void> {
        switch (template) {
            case TemplateType.desert:
                this.applySettings(gui, desertTemplate);
                break;
            case TemplateType.temperate:
                this.applySettings(gui, temperateTemplate);
                break;
        }
    }

    public async load(gui: GUI): Promise<boolean> {
        try {
            const fileHandle = await window.showOpenFilePicker(SettingsManager.OPEN_PICKER_OPTIONS);
            if (fileHandle.length < 1) {
                return false;
            }
            const file = await fileHandle[0].getFile();
            const json = await file.text();
            this.applySettings(gui, JSON.parse(json));
            return true;
        }
        catch (error) {
            console.debug(error);
        }
        return false;
    }

    public async save(gui: GUI): Promise<void> {
        var blob = new Blob(
            [JSON.stringify(gui.save(true), LightSettings.replacer)],
            { type: SettingsManager.JSON_MIME_TYPE }
        );
        try {
            const fileHandle = await window.showSaveFilePicker(SettingsManager.SAVE_PICKER_OPTIONS);
            const writableFileStream = await fileHandle.createWritable();
            await writableFileStream.write(blob);
            await writableFileStream.close();
        }
        catch (error) {
            console.debug(error);
        }
    }

    private applySettings(gui: GUI, settings: any): void {
        gui.load(settings, true);
        this.light.updateSunPosition();
    }
}
