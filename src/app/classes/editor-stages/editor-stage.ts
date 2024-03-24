import { IDisposable } from '../disposable';

export interface IEditorStage extends IDisposable {
    readonly helpPageName: string;
    changed: boolean

    animate(delta: number): void;
    applyDebugSettings(): void;
    applyWaterSettings(): void;
    disable(): void;
    enable(): void;
    hide(): void;
    show(): void;
    updateLandscape(): Promise<void>;
}