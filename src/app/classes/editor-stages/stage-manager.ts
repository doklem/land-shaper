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
import { IEditorStage } from './editor-stage';

export class StageManager implements IDisposable {

    private readonly _stages: IEditorStage[];

    private _index: number;

    public get first(): boolean {
        return this._index === 0;
    }

    public get helpPageName(): string {
        return this._stages[this._index].helpPageName;
    }

    public get last(): Boolean {
        return this._index === this._stages.length - 1;
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
        const erosionStage = new ErosionStage(settings, scene, gui, textures, device, buffers);
        this._stages = [
            new TopologyStage(settings, scene, gui, textures, device, buffers),
            erosionStage,
            new ColoringStage(settings, scene, gui, textures, device, buffers, meshs, erosionStage.displacementMap),
            new SectionedStage(settings, scene, textures, device, buffers, meshs)
        ];
    }

    public async animate(delta: number): Promise<void> {
        this._stages.forEach(stage => stage.animate(delta));
    }

    public applyDebugSettings(): void {
        this._stages.forEach(stage => stage.applyDebugSettings());
    }

    public applyWaterSettings(): void {
        this._stages.forEach(stage => stage.applyWaterSettings());
    }

    public dispose(): void {
        this._stages.forEach(stage => stage.dispose());
    }

    public async initialize(): Promise<void> {
        const first = this._stages[0];
        await first.updateLandscape();
        first.show();
        this._stages.forEach(stage => stage.changed = true);
    }

    public async nextStage(): Promise<void> {
        if (this.last) {
            return;
        }
        const current = this._stages[this._index];
        const next = this._stages[this._index + 1];
        current.hide();
        next.show();
        if (current.changed) {
            next.disable();
            await next.updateLandscape().then(() => {
                next.changed = true;
                next.enable();
            });
        } else {
            next.show();
        }
        this._index++;
    }

    public async previousStage(): Promise<void> {
        if (this.first) {
            return;
        }
        this._stages[this._index].hide();
        this._stages[this._index - 1].show();
        this._index--;
    }
}