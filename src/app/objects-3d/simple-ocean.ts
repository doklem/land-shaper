import { Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { IDisposable } from '../disposable';
import { TextureService } from '../services/texture-service';
import { IServiceProvider } from '../services/service-provider';

export class SimpleOcean extends Mesh<PlaneGeometry, MeshStandardMaterial> implements IDisposable {

    constructor(private readonly _serviceProvider: IServiceProvider) {
        super(
            new PlaneGeometry(
                _serviceProvider.settings.constants.meshSize.x,
                _serviceProvider.settings.constants.meshSize.y
            ),
            new MeshStandardMaterial({
                color: _serviceProvider.settings.ocean.color,
                side: _serviceProvider.settings.debug.side,
                wireframe: _serviceProvider.settings.debug.wireframe,
                flatShading: true,
            })
        );
    }
    
    public applyDebugSettings(): void {
        this.material.side = this._serviceProvider.settings.debug.side;
        this.material.wireframe = this._serviceProvider.settings.debug.wireframe;
        this.material.needsUpdate = true;
    }

    public applySettings(): void {
        this.material.color.copy(this._serviceProvider.settings.ocean.color);
        this.material.needsUpdate = true;
    }
    
    public dispose(): void {
        this.geometry.dispose();
        TextureService.disposeMaterialTextures(this.material);
        this.material.dispose();
    }    
}