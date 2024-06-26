import { AmbientLight, DirectionalLight, Group } from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { IDisposable } from '../disposable';
import { IServiceProvider } from '../services/service-provider';

export class SkyBox extends Group implements IDisposable {

    private readonly _sky: Sky;
    private readonly _ambientLight: AmbientLight;
    private readonly _directionalLight: DirectionalLight;

    constructor(private readonly _serviceProvider: IServiceProvider) {
        super();

        // Lights
        this._ambientLight = new AmbientLight(_serviceProvider.settings.light.ambient, 1);
        this._directionalLight = new DirectionalLight(_serviceProvider.settings.light.directional, 3);
        this._directionalLight.castShadow = true;

        // Sky
        this._sky = new Sky();
        this._sky.scale.setScalar(450000);
        const uniforms = this._sky.material.uniforms;
        uniforms['mieCoefficient'].value = 0.005;
        uniforms['mieDirectionalG'].value = 0.7;

        this.update();
        this.add(this._ambientLight, this._directionalLight, this._sky);
    }
    
    public dispose(): void {
        this._ambientLight.dispose();
        this._directionalLight.dispose();
    }

    public update(): void {
        this._sky.material.uniforms['sunPosition'].value.copy(this._serviceProvider.settings.light.sunPosition);
        this._sky.material.uniforms['turbidity'].value = this._serviceProvider.settings.sky.turbidity;
        this._sky.material.uniforms['rayleigh'].value = this._serviceProvider.settings.sky.rayleigh;
        this._sky.material.needsUpdate = true;

        this._ambientLight.color.set(this._serviceProvider.settings.light.ambient);
        this._directionalLight.color.set(this._serviceProvider.settings.light.directional);
        this._directionalLight.position.copy(this._serviceProvider.settings.light.sunPosition);
    }
}