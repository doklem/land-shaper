import { EditStageBase } from './edit-stage-base';
import { GUI, Controller } from 'lil-gui';
import { ErosionLandscape } from '../objects-3d/landscapes/erosion-landscape';
import { IServiceProvider } from '../services/service-provider';
import { IDisplacementDefinition } from '../objects-3d/displacement-definition';
import { ErosionType } from './erosion-type';

export class ErosionStage extends EditStageBase<ErosionLandscape> {

    private readonly _erosionAffectedControllers: Controller[];
    private readonly _settingsActions = {
        toggleDropletErosion: () => this.toggleErosion(ErosionType.droplet),
        blurTerrain: async () => await this.runBlur(),
    };

    private _dropletErosionToggle?: Controller;
    private _erosionType: ErosionType;

    protected readonly _landscape: ErosionLandscape;

    public readonly helpPageName = 'Erosion-Stage';

    public get displacement(): IDisplacementDefinition {
        return this._landscape.displacement;
    }

    constructor(serviceProvider: IServiceProvider) {
        super(serviceProvider);
        this._erosionType = ErosionType.none;
        this._erosionAffectedControllers = [];
        this._landscape = new ErosionLandscape(serviceProvider);
        this._sceneElements.push(this._landscape);
    }

    public override addGUI(parent: GUI): void {
        const dropletErosion = this._serviceProvider.settings.dropletErosion;
        const blur = this._serviceProvider.settings.blur;

        const dropletErosionFolder = parent.addFolder('Droplet Erosion').hide();
        this._folders.push(dropletErosionFolder);
        this._erosionAffectedControllers.push(dropletErosionFolder.add(dropletErosion, 'iterations', 1, 2000, 1).name('Iterations'));
        this._erosionAffectedControllers.push(dropletErosionFolder.add(dropletErosion, 'maxLifetime', 1, 100, 1).name('Maximum Lifetime'));
        this._erosionAffectedControllers.push(dropletErosionFolder.add(dropletErosion, 'inertia', 0, 1, 0.01).name('Inertia'));
        this._erosionAffectedControllers.push(dropletErosionFolder.add(dropletErosion, 'gravity', 0.01, 100, 0.001).name('Gravity'));
        this._erosionAffectedControllers.push(dropletErosionFolder.add(dropletErosion, 'sedimentCapacityFactor', 0.01, 100, 0.01).name('Sediment Capacity Factor'));
        this._erosionAffectedControllers.push(dropletErosionFolder.add(dropletErosion, 'minSedimentCapacity', 0.01, 100, 0.01).name('Minimum Sediment Capacity'));
        this._erosionAffectedControllers.push(dropletErosionFolder.add(dropletErosion, 'depositSpeed', 0, 10, 0.1).name('Deposit Speed'));
        this._erosionAffectedControllers.push(dropletErosionFolder.add(dropletErosion, 'erodeSpeed', 0, 10, 0.1).name('Erode Speed'));
        this._erosionAffectedControllers.push(dropletErosionFolder.add(dropletErosion, 'evaporateSpeed', 0, 1, 0.01).name('Evaporate Speed'));
        this._erosionAffectedControllers.push(dropletErosionFolder.add(dropletErosion, 'startSpeed', 0.01, 100, 0.01).name('Start Speed'));
        this._erosionAffectedControllers.push(dropletErosionFolder.add(dropletErosion, 'startWater', 0.01, 100, 0.01).name('Start Water'));
        this._dropletErosionToggle = dropletErosionFolder.add(this._settingsActions, 'toggleDropletErosion').name('Start Erosion');

        const blurFolder = parent.addFolder('Blur').hide();
        this._folders.push(blurFolder);
        this._erosionAffectedControllers.push(blurFolder.add(blur.size, 'x', 0, 100, 1).name('Radius X'));
        this._erosionAffectedControllers.push(blurFolder.add(blur.size, 'y', 0, 100, 1).name('Radius Y'));
        this._erosionAffectedControllers.push(blurFolder.add(blur, 'strength', 0, 1, 0.01).name('Strength'));
        this._erosionAffectedControllers.push(blurFolder.add(this._settingsActions, 'blurTerrain').name('Blur Terrain'));
    }

    protected override onVisibilityChange(visibility: boolean): void {
        super.onVisibilityChange(visibility);
        this.stopErosion();
        if (visibility) {
            this.runErosion();
        }
    }

    private async runBlur(): Promise<void> {
        if (this._erosionType !== ErosionType.none || !this._visible) {
            return;
        }
        this.changed = true;
        await this._landscape.runBlur();
    }

    private runErosion(): void {
        if (!this._visible) {
            return;
        }
        switch (this._erosionType) {
            case ErosionType.droplet:
                this.changed = true;
                this._landscape.runDropletErosion().then(() => this.runErosion());
                break;
            default:
                setTimeout(() => this.runErosion(), 100);
        }
    }

    private stopDropletErosion(): void {
        this._erosionAffectedControllers.forEach(controller => controller.enable());
        this._dropletErosionToggle?.name('Start Erosion');
    }

    private stopErosion(): void {
        switch (this._erosionType) {
            case ErosionType.droplet: {
                this.stopDropletErosion();
            }
        }
        this._erosionType = ErosionType.none;
    }

    private toggleErosion(erosionType: ErosionType): void {
        switch (erosionType) {
            case ErosionType.droplet:
                if (this._erosionType === ErosionType.none) {
                    this._erosionAffectedControllers.forEach(controller => controller.disable());
                    this._dropletErosionToggle?.name('Stop Erosion');
                    this._erosionType = ErosionType.droplet;
                    return;
                }
                if (this._erosionType === ErosionType.droplet) {
                    this.stopDropletErosion();
                    this._erosionType = ErosionType.none;
                    return;
                }
                break;
        }
    }
}
