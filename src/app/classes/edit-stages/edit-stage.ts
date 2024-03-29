import GUI from 'lil-gui';
import { IDisposable } from '../disposable';

export interface IEditStage extends IDisposable {
    readonly helpPageName: string;
    changed: boolean

    addGUI(parent: GUI): void;
    animate(delta: number): void;
    applyDebugSettings(): void;
    applyWaterSettings(): void;
    disable(): void;
    enable(): void;
    hide(): void;
    show(): void;
    updateLandscape(): Promise<void>;
}