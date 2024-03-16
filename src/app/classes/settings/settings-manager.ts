import { Color, Matrix4, Vector2, Vector3 } from 'three';
import { LightSettings } from './light-settings';

export class SettingsManager {

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
        readonly transformation: Matrix4;
    };

    public readonly debug = {
        wireframe: false,
    };

    public readonly light = new LightSettings(
        45,
        92,
        new Color(0.604, 0.784, 0.874),
        new Color(1, 1, 1));

    public readonly ocean = {
        color: new Color(0, 0.118, 0.059),
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
            vertexSizeFinalMinimum: new Vector2(2, 2),
            transformation: new Matrix4().makeRotationX(Math.PI * -0.5)
        };
    }
}