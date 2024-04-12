import { IDisposable } from '../disposable';
import { ColoringStage } from '../edit-stages/coloring-stage';
import { ErosionStage } from '../edit-stages/erosion-stage';
import { SectionedStage } from '../edit-stages/sectioned-stage';
import { TopologyStage } from '../edit-stages/topology-stage';
import { GUI } from 'lil-gui';
import { IEditStage } from '../edit-stages/edit-stage';
import { IServiceProvider } from './service-provider';

export class EditStageService implements IDisposable {

    private readonly _stages: IEditStage[];

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

    constructor(serviceProvider: IServiceProvider) {
        this._index = 0;
        const erosionStage = new ErosionStage(serviceProvider);
        this._stages = [
            new TopologyStage(serviceProvider),
            erosionStage,
            new ColoringStage(serviceProvider, erosionStage.displacement),
            new SectionedStage(serviceProvider)
        ];
    }

    public addGUI(parent: GUI): void {
        this._stages.forEach(stage => stage.addGUI(parent));
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
        this._index = 0;
    }

    public hideAll(): void {
        this._stages.forEach(stage => stage.hide());
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