import { DataTexture, Scene } from 'three';
import { EditorStageBase } from './editor-stage-base';
import { GUI, Controller } from 'lil-gui';
import { TextureManager } from '../gpu-resources/texture-manager';
import { BufferManager } from '../gpu-resources/buffer-manager';
import { ErosionLandscape } from '../objects-3d/landscapes/erosion-landscape';
import { SettingsManager } from '../settings/settings-manager';

export class ErosionStage extends EditorStageBase<ErosionLandscape> {
    
    private readonly _erosionToggle: Controller;
    private readonly _erosionAffectedControllers: Controller[];
    private readonly _settingsActions = {
        toggleErosion: () => this.setErosionState(!this._erosionRunning),
        blurTerrain: async () => await this.runBlur(),
    };

    protected readonly _landscape: ErosionLandscape;

    public readonly helpPageName = 'Erosion-Stage';

    public get displacementMap(): DataTexture {
        return this._landscape.displacementMap;
    }

    private _erosionRunning: boolean;

    constructor(
        settings: SettingsManager,
        scene: Scene,
        gui: GUI,
        textures: TextureManager,
        device: GPUDevice,
        buffers: BufferManager) {
        super(scene);

        this._erosionRunning = false;
        this._erosionAffectedControllers = [];

        const erosionFolder = gui.addFolder('Erosion').hide();
        this._uiElements.push(erosionFolder);
        this._erosionAffectedControllers.push(erosionFolder.add(settings.erosion, 'iterations', 1, 2000, 1).name('Iterations'));
        this._erosionAffectedControllers.push(erosionFolder.add(settings.erosion, 'maxLifetime', 1, 100, 1).name('Maximum Lifetime'));
        this._erosionAffectedControllers.push(erosionFolder.add(settings.erosion, 'inertia', 0, 1, 0.01).name('Inertia'));
        this._erosionAffectedControllers.push(erosionFolder.add(settings.erosion, 'gravity', 0.01, 100, 0.001).name('Gravity'));
        this._erosionAffectedControllers.push(erosionFolder.add(settings.erosion, 'sedimentCapacityFactor', 0.01, 100, 0.01).name('Sediment Capacity Factor'));
        this._erosionAffectedControllers.push(erosionFolder.add(settings.erosion, 'minSedimentCapacity', 0.01, 100, 0.01).name('Minimum Sediment Capacity'));
        this._erosionAffectedControllers.push(erosionFolder.add(settings.erosion, 'depositSpeed', 0, 10, 0.1).name('Deposit Speed'));
        this._erosionAffectedControllers.push(erosionFolder.add(settings.erosion, 'erodeSpeed', 0, 10, 0.1).name('Erode Speed'));
        this._erosionAffectedControllers.push(erosionFolder.add(settings.erosion, 'evaporateSpeed', 0, 1, 0.01).name('Evaporate Speed'));
        this._erosionAffectedControllers.push(erosionFolder.add(settings.erosion, 'startSpeed', 0.01, 100, 0.01).name('Start Speed'));
        this._erosionAffectedControllers.push(erosionFolder.add(settings.erosion, 'startWater', 0.01, 100, 0.01).name('Start Water'));
        this._erosionToggle = erosionFolder.add(this._settingsActions, 'toggleErosion').name('Start Erosion');

        const blurFolder = gui.addFolder('Blur').hide();
        this._uiElements.push(blurFolder);
        this._erosionAffectedControllers.push(blurFolder.add(settings.blur.size, 'x', 0, 100, 1).name('Radius X'));
        this._erosionAffectedControllers.push(blurFolder.add(settings.blur.size, 'y', 0, 100, 1).name('Radius Y'));
        this._erosionAffectedControllers.push(blurFolder.add(settings.blur, 'strength', 0, 1, 0.01).name('Strength'));
        this._erosionAffectedControllers.push(blurFolder.add(this._settingsActions, 'blurTerrain').name('Blur Terrain'));

        this._landscape = new ErosionLandscape(settings, textures, device, buffers);
        this._sceneElements.push(this._landscape);
    }

    public async updateLandscape(): Promise<void> {
        await this._landscape.runLandscape();
    }

    protected override onStateChange(state: boolean): void {
        super.onStateChange(state);
        this.setErosionState(false);
        if (state) {
            this.runErosion();
        }
    }

    private setErosionState(state: boolean): void {
        this._erosionRunning = state;
        if (state) {
            this._erosionAffectedControllers.forEach(controller => controller.disable());
            this._erosionToggle.name('Stop Erosion');
        } else {
            this._erosionAffectedControllers.forEach(controller => controller.enable());
            this._erosionToggle.name('Start Erosion');
        }
    }

    private async runBlur(): Promise<void> {
        if (this._erosionRunning) {
            return;
        }
        await this._landscape.runBlur();
    }

    private runErosion(): void {
        if (!this.enabled) {
            return;
        }
        if (this._erosionRunning) {
            this._landscape.runErosion().then(() => this.runErosion());
        } else {
            setTimeout(() => this.runErosion(), 100);
        }
    }
}
