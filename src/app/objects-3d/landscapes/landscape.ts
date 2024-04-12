import { IDisposable } from '../../disposable';

export interface ILandscape extends IDisposable {
    applyDebugSettings(): void;
    applyWaterSettings(): void;
    runLandscape(): Promise<void>;
}