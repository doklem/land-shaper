import { Object3D, Scene } from 'three';
import { IDisposable } from '../disposable';
import { ILandscape } from '../objects-3d/landscapes/landscape';
import { GUI } from 'lil-gui';

export abstract class EditorStageBase<T extends ILandscape> implements IDisposable {

    private _enabled: boolean;

    protected readonly _uiElements: GUI[];
    protected readonly _sceneElements: Object3D[];

    protected readonly abstract _landscape: T;

    public abstract readonly helpPageName: string;

    public get enabled(): boolean {
        return this._enabled;
    }

    constructor(private readonly _scene: Scene) {
        this._enabled = false;
        this._uiElements = [];
        this._sceneElements = [];
    }

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

    public applyWaterSettings(){
        this._landscape.applyWaterSettings();
    }

    protected onStateChange(state: boolean): void { }
}