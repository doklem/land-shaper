import { Scene } from 'three';
import { EditorStageBase } from './editor-stage-base';
import { TextureManager } from '../gpu-resources/texture-manager';
import { BufferManager } from '../gpu-resources/buffer-manager';
import { SectionedLandscape } from '../objects-3d/landscapes/sectioned-landscape';
import { MeshManager } from '../gpu-resources/mesh-manager';
import { SettingsManager } from '../settings/settings-manager';

export class SectionedStage extends EditorStageBase<SectionedLandscape> {

    protected readonly _landscape: SectionedLandscape;

    constructor(
        settings: SettingsManager,
        scene: Scene,
        textures: TextureManager,
        device: GPUDevice,
        buffers: BufferManager,
        meshs: MeshManager) {
        super(scene);

        this._landscape = new SectionedLandscape(settings, textures, device, buffers, meshs);
        this._sceneElements.push(this._landscape);
    }

    public animate(delta: number): void {
        this._landscape.animate(delta);
    }

    public async updateLandscape(): Promise<void> {
        await this._landscape.runLandscape();
    }
}