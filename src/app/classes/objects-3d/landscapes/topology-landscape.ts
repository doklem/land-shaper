import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { TextureService } from '../../services/texture-service';
import { DisplacementRenderNode } from '../../nodes/render-nodes/displacement-render-node';
import { ILandscape } from './landscape';
import { SimpleOcean } from '../simple-ocean';
import { IServiceProvider } from '../../services/service-provider';

export class TopologyLandscape extends Group implements ILandscape {

    private readonly _displacementRenderNode: DisplacementRenderNode;
    private readonly _displacementOutput: Float32Array;
    private readonly _terrain: Mesh<PlaneGeometry, MeshStandardMaterial>;
    private readonly _ocean: SimpleOcean;

    private _running: boolean;

    constructor(private readonly _serviceProvider: IServiceProvider) {
        super();
        this._running = false;
        this.applyMatrix4(_serviceProvider.settings.constants.transformation);

        this._displacementRenderNode = new DisplacementRenderNode(_serviceProvider, true);
        this._displacementOutput = new Float32Array(this._displacementRenderNode.textureSettings.valuesLength);

        this._terrain = new Mesh(
            new PlaneGeometry(_serviceProvider.settings.constants.meshSize.x,
                _serviceProvider.settings.constants.meshSize.y,
                _serviceProvider.settings.constants.vertexSizeTopology.x,
                _serviceProvider.settings.constants.vertexSizeTopology.y),
            new MeshStandardMaterial({
                color: 0x86B036,
                displacementScale: 1,
                displacementMap: TextureService.createDataTexture(this._displacementOutput, this._displacementRenderNode.textureSettings),
                flatShading: true,
                metalness: 0,
                roughness: 1,
                side: _serviceProvider.settings.debug.side,
                wireframe: _serviceProvider.settings.debug.wireframe
            })
        );
        this._terrain.material.displacementMap!.needsUpdate = true;
        this._terrain.castShadow = false;
        this._terrain.receiveShadow = true;
        this.add(this._terrain);

        this._ocean = new SimpleOcean(_serviceProvider);
        this.add(this._ocean);
    }
    
    public dispose(): void {
        this._terrain.geometry.dispose();
        TextureService.disposeMaterialTextures(this._terrain.material);
        this._terrain.material.dispose();
        this._displacementRenderNode.dispose();
        this._ocean.dispose();
    }

    public async runLandscape(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;
        this._displacementRenderNode.configureRun();

        const commandEncoder = this._serviceProvider.device.createCommandEncoder();
        this._displacementRenderNode.appendRenderPass(commandEncoder);
        this._serviceProvider.device.queue.submit([commandEncoder.finish()]);

        await this._displacementRenderNode.readOutputBuffer(this._displacementOutput);
        this._terrain.material.displacementMap!.needsUpdate = true;
        this._terrain.material.needsUpdate = true;
        this._running = false;
    }

    public applyDebugSettings(): void {
        this._terrain.material.side = this._serviceProvider.settings.debug.side;
        this._terrain.material.wireframe = this._serviceProvider.settings.debug.wireframe;
        this._terrain.material.needsUpdate = true;
        this._ocean.applyDebugSettings();
    }

    public applyWaterSettings(): void {
        this._ocean.applySettings();
    }
}