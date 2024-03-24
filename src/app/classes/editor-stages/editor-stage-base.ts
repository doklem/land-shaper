import { Object3D, Scene } from 'three';
import { ILandscape } from '../objects-3d/landscapes/landscape';
import { GUI } from 'lil-gui';
import { IEditorStage } from './editor-stage';

export abstract class EditorStageBase<T extends ILandscape> implements IEditorStage {

    protected _enabled: boolean;

    protected readonly _uiElements: GUI[];
    protected readonly _sceneElements: Object3D[];
    protected readonly abstract _landscape: T;

    public abstract readonly helpPageName: string;

    public changed: boolean;

    constructor(private readonly _scene: Scene) {
        this.changed = false;
        this._enabled = false;
        this._uiElements = [];
        this._sceneElements = [];
    }

    public animate(delta: number): void { }

    public enable(): void {
        if (this._enabled) {
            return;
        }
        this._enabled = true;
        this._uiElements.forEach(uiElement => uiElement.show());
        this._sceneElements.forEach(sceneElement => this._scene.add(sceneElement));
        this.onStateChange(true);
    }

    public disable(): void {
        if (!this._enabled) {
            return;
        }
        this._enabled = false;
        this._uiElements.forEach(uiElement => uiElement.hide());
        this._sceneElements.forEach(sceneElement => this._scene.remove(sceneElement));
        this.onStateChange(false);
    }

    public dispose(): void {
        this.disable();
        this._landscape.dispose();
    }

    public applyDebugSettings(): void {
        this._landscape.applyDebugSettings();
    }

    public applyWaterSettings(): void {
        this._landscape.applyWaterSettings();
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