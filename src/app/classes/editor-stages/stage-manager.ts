import { Scene } from 'three';
import { IDisposable } from '../disposable';
import { SettingsManager } from '../settings/settings-manager';
import { ColoringStage } from './coloring-stage';
import { ErosionStage } from './erosion-stage';
import { SectionedStage } from './sectioned-stage';
import { TopologyStage } from './topology-stage';
import GUI from 'lil-gui';
import { TextureManager } from '../gpu-resources/texture-manager';
import { BufferManager } from '../gpu-resources/buffer-manager';
import { MeshManager } from '../gpu-resources/mesh-manager';

export class StageManager implements IDisposable {

    private readonly _coloringStage: ColoringStage;
    private readonly _erosionStage: ErosionStage;
    private readonly _sectionedStage: SectionedStage;
    private readonly _topologyStage: TopologyStage;

    private _index: number;

    public get first(): boolean {
        return this._index === 0;
    }

    public get helpPageName(): string {
        if (this._topologyStage.enabled) {
            return this._topologyStage.helpPageName;
        }
        if (this._erosionStage.enabled) {
            return this._erosionStage.helpPageName;
        }
        if (this._coloringStage.enabled) {
            return this._coloringStage.helpPageName;
        }
        if (this._sectionedStage.enabled) {
            return this._sectionedStage.helpPageName;
        }
        return '';
    }

    public get last(): Boolean {
        return this._index === 3;
    }

    constructor(
        settings: SettingsManager,
        scene: Scene,
        gui: GUI,
        textures: TextureManager,
        device: GPUDevice,
        buffers: BufferManager,
        meshs: MeshManager
    ) {
        this._index = 0;
        this._topologyStage = new TopologyStage(settings, scene, gui, textures, device, buffers);
        this._erosionStage = new ErosionStage(settings, scene, gui, textures, device, buffers);
        this._coloringStage = new ColoringStage(settings, scene, gui, textures, device, buffers, meshs, this._erosionStage.displacementMap);
        this._sectionedStage = new SectionedStage(settings, scene, textures, device, buffers, meshs);
    }

    public async animate(delta: number): Promise<void> {
        this._coloringStage.animate(delta);
        this._sectionedStage.animate(delta);
    }

    public applyDebugSettings(): void {
        this._sectionedStage.applyDebugSettings();
        this._topologyStage.applyDebugSettings();
        this._erosionStage.applyDebugSettings();
        this._coloringStage.applyDebugSettings();
    }

    public applyWaterSettings(): void {
        this._sectionedStage.applyWaterSettings();
        this._topologyStage.applyWaterSettings();
        this._erosionStage.applyWaterSettings();
        this._coloringStage.applyWaterSettings();
    }

    public dispose(): void {
        this._sectionedStage.dispose();
        this._topologyStage.dispose();
        this._erosionStage.dispose();
        this._coloringStage.dispose();
    }

    public async initialize(): Promise<void> {
        await Promise.all([
            this._topologyStage.updateLandscape().then(() => this._topologyStage.enable()),
            this._erosionStage.updateLandscape().then(_ => this._coloringStage.updateLandscape())
        ]);
    }

    public async nextStage(): Promise<void> {
        switch (this._index) {
            case 0:
                this._topologyStage.disable();
                if (this._topologyStage.changed) {
                    this._erosionStage.updateLandscape();
                }
                this._erosionStage.enable();
                break;
            case 1:
                this._erosionStage.disable();
                this._coloringStage.updateLandscape();
                this._coloringStage.enable();
                break;
            case 2:
                this._coloringStage.disable();
                this._sectionedStage.updateLandscape();
                this._sectionedStage.enable();
                break;
            default:
                return;
        }
        this._index++;
    }

    public async previousStage(): Promise<void> {
        switch (this._index) {
            case 3:
                this._sectionedStage.disable();
                this._coloringStage.enable();
                break;
            case 2:
                this._coloringStage.disable();
                this._erosionStage.enable();
                break;
            case 1:
                this._erosionStage.disable();
                this._topologyStage.enable();
                break;
            default:
                return;

        }
        this._index--;
    }
}