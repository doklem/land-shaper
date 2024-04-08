import { Color, MathUtils, Vector3 } from 'three';
import { ILightOptions } from './light-options';

export class LightSettings implements ILightOptions {

    private _elevation: number;
    private _azimuth: number;
    private _sunPosition = new Vector3();

    public ambient: Color;
    public directional: Color;

    public get elevation(): number {
        return this._elevation;
    }

    public set elevation(value: number) {
        this._elevation = value;
        this.updateSunPosition();
    }

    public get azimuth(): number {
        return this._azimuth;
    }

    public set azimuth(value: number) {
        this._azimuth = value;
        this.updateSunPosition();
    }

    public get sunPosition(): Vector3 {
        return this._sunPosition;
    }

    constructor() {
        this._azimuth = 0;
        this._elevation = 0;
        this.updateSunPosition();
        this.ambient = new Color();
        this.directional = new Color();
    }

    public set(options: ILightOptions): void {
        this.ambient.set(options.ambient);
        this._azimuth = options.azimuth;
        this._elevation = options.elevation;
        this.directional.set(options.directional);
        this.updateSunPosition();
    }

    private updateSunPosition(): void {
        const phi = MathUtils.degToRad(90 - this._elevation);
        const theta = MathUtils.degToRad(this._azimuth);
        this._sunPosition = new Vector3().setFromSphericalCoords(1, phi, theta);
    }
}