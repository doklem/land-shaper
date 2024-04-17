import { Object3D } from 'three';
import { ILandscape } from '../objects-3d/landscapes/landscape';
import { GUI } from 'lil-gui';
import { IEditStage } from './edit-stage';
import { IServiceProvider } from '../services/service-provider';

export abstract class EditStageBase<T extends ILandscape> implements IEditStage {

    protected _visible: boolean;

    protected readonly _folders: GUI[];
    protected readonly _sceneElements: Object3D[];
    protected readonly abstract _landscape: T;

    public abstract readonly helpPageName: string;

    public changed: boolean;

    constructor(protected readonly _serviceProvider: IServiceProvider) {
        this.changed = false;
        this._visible = false;
        this._folders = [];
        this._sceneElements = [];
    }

    public addGUI(parent: GUI): void { }

    public animate(delta: number): void { }

    public applyDebugSettings(): void {
        this._landscape.applyDebugSettings();
    }

    public applyWaterSettings(): void {
        this._landscape.applyWaterSettings();
    }

    public disable(): void {
        this._folders.forEach(folder => folder.controllers.forEach(controller => controller.disable()));
    }

    public dispose(): void {
        this.hide();
        this._landscape.dispose();
    }

    public enable(): void {
        this._folders.forEach(folder => folder.controllers.forEach(controller => controller.enable()));
    }

    public hide(): void {
        if (!this._visible) {
            return;
        }
        this._visible = false;
        this._folders.forEach(uiElement => uiElement.hide());
        this._sceneElements.forEach(sceneElement => this._serviceProvider.scene.remove(sceneElement));
        this.onVisibilityChange(false);
    }

    public show(): void {
        if (this._visible) {
            return;
        }
        this._visible = true;
        this._folders.forEach(uiElement => uiElement.show());
        this._sceneElements.forEach(sceneElement => this._serviceProvider.scene.add(sceneElement));
        this.onVisibilityChange(true);
    }

    public async updateLandscape(): Promise<void> {
        await this._landscape.runLandscape();
    }

    protected onVisibilityChange(visibility: boolean): void {
        if (visibility) {
            this.changed = false;
        }
    }
}