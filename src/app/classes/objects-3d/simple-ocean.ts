import { DoubleSide, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { IDisposable } from '../disposable';
import { SettingsManager } from '../settings/settings-manager';
import { TextureManager } from '../gpu-resources/texture-manager';

export class SimpleOcean extends Mesh<PlaneGeometry, MeshStandardMaterial> implements IDisposable {

    constructor(private readonly _settings: SettingsManager) {
        super(
            new PlaneGeometry(
                _settings.constants.meshSize.x,
                _settings.constants.meshSize.y
            ),
            new MeshStandardMaterial({
                color: _settings.ocean.color,
                side: DoubleSide,
                flatShading: true,
            })
        );
    }

    public applySettings(): void {
        this.material.color.copy(this._settings.ocean.color);
        this.material.needsUpdate = true;
    }
    
    public dispose(): void {
        this.geometry.dispose();
        TextureManager.disposeMaterialTextures(this.material);
        this.material.dispose();
    }    
}