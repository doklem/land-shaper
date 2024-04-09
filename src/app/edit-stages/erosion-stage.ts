import { EditStageBase } from './edit-stage-base';
import { GUI, Controller } from 'lil-gui';
import { ErosionLandscape } from '../objects-3d/landscapes/erosion-landscape';
import { IServiceProvider } from '../services/service-provider';
import { IDisplacementDefinition } from '../objects-3d/displacement-definition';

export class ErosionStage extends EditStageBase<ErosionLandscape> {
    
    private readonly _erosionAffectedControllers: Controller[];
    private readonly _settingsActions = {
        toggleErosion: () => this.setErosionState(!this._erosionRunning),
        blurTerrain: async () => await this.runBlur(),
    };
    
    private _erosionToggle?: Controller;
    private _erosionRunning: boolean;

    protected readonly _landscape: ErosionLandscape;

    public readonly helpPageName = 'Erosion-Stage';

    public get displacement(): IDisplacementDefinition {
        return this._landscape.displacement;
    }

    constructor(serviceProvider: IServiceProvider) {
        super(serviceProvider);
        this._erosionRunning = false;
        this._erosionAffectedControllers = [];
        this._landscape = new ErosionLandscape(serviceProvider);
        this._sceneElements.push(this._landscape);
    }

    public override addGUI(parent: GUI): void {
        const erosion = this._serviceProvider.settings.erosion;
        const blur = this._serviceProvider.settings.blur;

        const erosionFolder = parent.addFolder('Erosion').hide();
        this._folders.push(erosionFolder);
        this._erosionAffectedControllers.push(erosionFolder.add(erosion, 'iterations', 1, 2000, 1).name('Iterations'));
        this._erosionAffectedControllers.push(erosionFolder.add(erosion, 'maxLifetime', 1, 100, 1).name('Maximum Lifetime'));
        this._erosionAffectedControllers.push(erosionFolder.add(erosion, 'inertia', 0, 1, 0.01).name('Inertia'));
        this._erosionAffectedControllers.push(erosionFolder.add(erosion, 'gravity', 0.01, 100, 0.001).name('Gravity'));
        this._erosionAffectedControllers.push(erosionFolder.add(erosion, 'sedimentCapacityFactor', 0.01, 100, 0.01).name('Sediment Capacity Factor'));
        this._erosionAffectedControllers.push(erosionFolder.add(erosion, 'minSedimentCapacity', 0.01, 100, 0.01).name('Minimum Sediment Capacity'));
        this._erosionAffectedControllers.push(erosionFolder.add(erosion, 'depositSpeed', 0, 10, 0.1).name('Deposit Speed'));
        this._erosionAffectedControllers.push(erosionFolder.add(erosion, 'erodeSpeed', 0, 10, 0.1).name('Erode Speed'));
        this._erosionAffectedControllers.push(erosionFolder.add(erosion, 'evaporateSpeed', 0, 1, 0.01).name('Evaporate Speed'));
        this._erosionAffectedControllers.push(erosionFolder.add(erosion, 'startSpeed', 0.01, 100, 0.01).name('Start Speed'));
        this._erosionAffectedControllers.push(erosionFolder.add(erosion, 'startWater', 0.01, 100, 0.01).name('Start Water'));
        this._erosionToggle = erosionFolder.add(this._settingsActions, 'toggleErosion').name('Start Erosion');

        const blurFolder = parent.addFolder('Blur').hide();
        this._folders.push(blurFolder);
        this._erosionAffectedControllers.push(blurFolder.add(blur.size, 'x', 0, 100, 1).name('Radius X'));
        this._erosionAffectedControllers.push(blurFolder.add(blur.size, 'y', 0, 100, 1).name('Radius Y'));
        this._erosionAffectedControllers.push(blurFolder.add(blur, 'strength', 0, 1, 0.01).name('Strength'));
        this._erosionAffectedControllers.push(blurFolder.add(this._settingsActions, 'blurTerrain').name('Blur Terrain'));
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
            this._erosionToggle?.name('Stop Erosion');
        } else {
            this._erosionAffectedControllers.forEach(controller => controller.enable());
            this._erosionToggle?.name('Start Erosion');
        }
    }

    private async runBlur(): Promise<void> {
        if (this._erosionRunning || !this._visible) {
            return;
        }
        this.changed = true;
        await this._landscape.runBlur();
    }

    private runErosion(): void {
        if (!this._visible) {
            return;
        }
        if (this._erosionRunning) {
            this.changed = true;
            this._landscape.runErosion().then(() => this.runErosion());
        } else {
            setTimeout(() => this.runErosion(), 100);
        }
    }
}
