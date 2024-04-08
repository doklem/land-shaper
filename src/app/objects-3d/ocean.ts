import { Color, PlaneGeometry, Vector3 } from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { IDisposable } from '../disposable';
import { IServiceProvider } from '../services/service-provider';

export class Ocean extends Water implements IDisposable {

    private _waterSpeed: number;

    constructor(private readonly _serviceProvider: IServiceProvider) {
        super(new PlaneGeometry(_serviceProvider.settings.constants.meshSize.x, _serviceProvider.settings.constants.meshSize.y),
        {
            textureWidth: _serviceProvider.settings.constants.ocean.textureSize.x,
            textureHeight: _serviceProvider.settings.constants.ocean.textureSize.y,
            waterNormals: _serviceProvider.meshs.waterNomrals,
            sunDirection: new Vector3(),
            sunColor: new Color(),
            waterColor: new Color(),
            distortionScale: _serviceProvider.settings.ocean.distortionScale,
            side: _serviceProvider.settings.debug.side,
            fog: false
        });
        this._waterSpeed = _serviceProvider.settings.ocean.speed;
        this.applySettings();
    }

    public applyDebugSettings(): void {
        this.material.side = this._serviceProvider.settings.debug.side;
        this.material.wireframe = this._serviceProvider.settings.debug.wireframe;
        this.material.needsUpdate = true;
    }

    public applySettings(): void {
        this.material.uniforms['sunDirection'].value.copy(this._serviceProvider.settings.light.sunPosition).normalize();
        this.material.uniforms['distortionScale'].value = this._serviceProvider.settings.ocean.distortionScale;
        this.material.uniforms['size'].value = this._serviceProvider.settings.ocean.size;
        this.material.uniforms['sunColor'].value.copy(this._serviceProvider.settings.light.directional);
        this.material.uniforms['waterColor'].value.copy(this._serviceProvider.settings.ocean.color);
        this.material.needsUpdate = true;
        this._waterSpeed = this._serviceProvider.settings.ocean.speed;
    }

    public animate(delta: number): void {
        this.material.uniforms['time'].value = this.material.uniforms['time'].value + (delta * this._waterSpeed);
    }
    
    public dispose(): void {
        this.geometry.dispose();
    }
}