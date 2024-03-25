import { Color, Vector3 } from 'three';

export class LightSettings {

    private _elevation: number;
    private _azimuth: number;
    private _sunPosition = new Vector3();

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

    constructor(elevation: number, azimuth: number, public ambient: Color, public directional: Color) {
        this._elevation = elevation;
        this._azimuth = azimuth;
        this.updateSunPosition();
    }

    public static replacer(key: string, value: any): any {
        switch (key) {
            case '_sunPosition':
                return undefined;
            default:
                return value;
        }
    }

    public updateSunPosition(): void {
        const phi = LightSettings.degToRad(90 - this._elevation);
        const theta = LightSettings.degToRad(this._azimuth);
        this._sunPosition = new Vector3().setFromSphericalCoords(1, phi, theta);
    }

    private static degToRad(value: number): number {
        return value * Math.PI / 180;
    }
}