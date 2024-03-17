import { Color, PlaneGeometry, Vector3 } from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { IDisposable } from '../disposable';
import { SettingsManager } from '../settings/settings-manager';
import { MeshManager } from '../gpu-resources/mesh-manager';

export class Ocean extends Water implements IDisposable {

    private _waterSpeed: number;

    constructor(private readonly _settings: SettingsManager, meshs: MeshManager) {
        super(new PlaneGeometry(_settings.constants.meshSize.x, _settings.constants.meshSize.y),
        {
            textureWidth: _settings.constants.ocean.textureSize.x,
            textureHeight: _settings.constants.ocean.textureSize.y,
            waterNormals: meshs.waterNomrals,
            sunDirection: new Vector3(),
            sunColor: new Color(),
            waterColor: new Color(),
            distortionScale: _settings.ocean.distortionScale,
            fog: false
        });
        this._waterSpeed = _settings.ocean.waterSpeed;
        this.applySettings();
    }

    public applySettings(): void {
        this.material.uniforms['sunDirection'].value.copy(this._settings.light.sunPosition).normalize();
        this.material.uniforms['distortionScale'].value = this._settings.ocean.distortionScale;
        this.material.uniforms['size'].value = this._settings.ocean.waterSize;
        this.material.uniforms['sunColor'].value.copy(this._settings.light.directional);
        this.material.uniforms['waterColor'].value.copy(this._settings.ocean.color);
        this.material.needsUpdate = true;
        this._waterSpeed = this._settings.ocean.waterSpeed;
    }

    public animate(delta: number): void {
        this.material.uniforms['time'].value = this.material.uniforms['time'].value + (delta * this._waterSpeed);
    }
    
    public dispose(): void {
        this.geometry.dispose();
    }
}