import { Color, Vector3 } from 'three';

export class LightSettings {

    private _elevation: number;
    private _azimuth: number;
    private _sunPosition: Vector3;

    public get elevation(): number {
        return this._elevation;
    }

    public set elevation(value: number) {
        this._elevation = value;
        this._sunPosition = this.calculateSunPosition();
    }

    public get azimuth(): number {
        return this._azimuth;
    }

    public set azimuth(value: number) {
        this._azimuth = value;
        this._sunPosition = this.calculateSunPosition();
    }

    public get sunPosition(): Vector3 {
        return this._sunPosition;
    }

    constructor(elevation: number, azimuth: number, public ambient: Color, public directional: Color) {
        this._elevation = elevation;
        this._azimuth = azimuth;
        this._sunPosition = this.calculateSunPosition();
    }

    private calculateSunPosition() : Vector3 {
        const phi = LightSettings.degToRad(90 - this._elevation);
        const theta = LightSettings.degToRad(this._azimuth);
        return new Vector3().setFromSphericalCoords(1, phi, theta);
    }

    private static degToRad(value: number): number {
        return value * Math.PI / 180;
    }
}