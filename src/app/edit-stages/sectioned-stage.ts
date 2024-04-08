import { EditStageBase } from './edit-stage-base';
import { SectionedLandscape } from '../objects-3d/landscapes/sectioned-landscape';
import { IServiceProvider } from '../services/service-provider';

export class SectionedStage extends EditStageBase<SectionedLandscape> {

    protected readonly _landscape: SectionedLandscape;

    public readonly helpPageName = 'Final-Stage';

    constructor(serviceProvider: IServiceProvider) {
        super(serviceProvider);

        this._landscape = new SectionedLandscape(serviceProvider);
        this._sceneElements.push(this._landscape);
    }

    public override animate(delta: number): void {
        this._landscape.animate(delta);
    }
}