import { MeshStandardMaterial, Vector2 } from 'three';
import { TextureService } from '../../services/texture-service';
import { NormalTangentSpaceRenderNode } from '../../nodes/render-nodes/normal-tangent-space-render-node';
import { IServiceProvider } from '../../services/service-provider';
import { ExportableByteRenderNodeBase } from '../../nodes/render-nodes/exportable-byte-render-node-base';
import { IDisplacementSource } from './displacement-source';
import { TerrainBase } from './terrain-base';

export class DisplacementDestinationTerrain extends TerrainBase {

    private readonly _normalOutput: Float32Array;

    protected readonly _material: MeshStandardMaterial;

    constructor(
        serviceProvider: IServiceProvider,
        meshSize: Vector2,
        vertexSizeMax: Vector2,
        vertexSizeMin: Vector2,
        meshLodDistance: number,
        flatShading: boolean,
        private readonly _normalTangentSpaceRenderNode: NormalTangentSpaceRenderNode,
        diffuseRenderNode: ExportableByteRenderNodeBase,
        displacement: IDisplacementSource) {
        super(
            serviceProvider,
            diffuseRenderNode,
            displacement.displacementRadius,
            displacement.displacementMin,
            displacement.displacementMax);
        this._normalOutput = new Float32Array(_normalTangentSpaceRenderNode.textureSettings.valuesLength);
        this._material = new MeshStandardMaterial({
            displacementMap: displacement.displacementMap,
            displacementScale: 1,
            flatShading: flatShading,
            map: TextureService.createDataTexture(this._diffuseOutput, this._diffuseRenderNode.textureSettings, true, serviceProvider.settings.constants.anisotropy),
            metalness: 0,
            normalMap: TextureService.createDataTexture(this._normalOutput, _normalTangentSpaceRenderNode.textureSettings),
            roughness: 1,
            side: serviceProvider.settings.debug.side,
            wireframe: serviceProvider.settings.debug.wireframe
        });
        this.initializeMeshs(meshSize, vertexSizeMax, vertexSizeMin, meshLodDistance);
    }

    public async applyRunOutput(): Promise<void> {
        await this.updateTerrain([this._normalTangentSpaceRenderNode.readOutputBuffer(this._normalOutput)]);
    }

    public async updateDiffuse(): Promise<void> {
        await this._diffuseRenderNode.readOutputBuffer(this._diffuseOutput);
        this._material.map!.needsUpdate = true;
        this._material.needsUpdate = true;
    }
}