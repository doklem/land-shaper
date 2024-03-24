import { Object3D, Scene } from 'three';
import { ILandscape } from '../objects-3d/landscapes/landscape';
import { Controller, GUI } from 'lil-gui';
import { IEditorStage } from './editor-stage';

export abstract class EditorStageBase<T extends ILandscape> implements IEditorStage {

    protected _visible: boolean;

    protected readonly _folders: GUI[];
    protected readonly _controllers: Controller[];
    protected readonly _sceneElements: Object3D[];
    protected readonly abstract _landscape: T;

    public abstract readonly helpPageName: string;

    public changed: boolean;

    constructor(private readonly _scene: Scene) {
        this.changed = false;
        this._visible = false;
        this._folders = [];
        this._controllers = [];
        this._sceneElements = [];
    }

    public animate(delta: number): void { }

    public applyDebugSettings(): void {
        this._landscape.applyDebugSettings();
    }

    public applyWaterSettings(): void {
        this._landscape.applyWaterSettings();
    }

    public disable(): void {
        this._controllers.forEach(controller => controller.disable());
    }

    public dispose(): void {
        this.hide();
        this._landscape.dispose();
    }

    public enable(): void {
        this._controllers.forEach(controller => controller.enable());
    }

    public hide(): void {
        if (!this._visible) {
            return;
        }
        this._visible = false;
        this._folders.forEach(uiElement => uiElement.hide());
        this._sceneElements.forEach(sceneElement => this._scene.remove(sceneElement));
        this.onStateChange(false);
    }

    public show(): void {
        if (this._visible) {
            return;
        }
        this._visible = true;
        this._folders.forEach(uiElement => uiElement.show());
        this._sceneElements.forEach(sceneElement => this._scene.add(sceneElement));
        this.onStateChange(true);
    }

    public async updateLandscape(): Promise<void> {
        await this._landscape.runLandscape();
    }

    protected onStateChange(state: boolean): void {
        if (state) {
            this.changed = false;
        }
    }
}