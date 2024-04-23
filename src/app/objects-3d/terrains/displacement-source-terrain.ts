import {
    MeshStandardMaterial,
    MeshStandardMaterialParameters,
    Texture,
    Vector2
} from 'three';
import { TextureService } from '../../services/texture-service';
import { NormalTangentSpaceRenderNode } from '../../nodes/render-nodes/normal-tangent-space-render-node';
import { IDisplacementNode } from '../../nodes/displacement-node';
import { ITextureSettings } from '../../settings/texture-settings';
import { IServiceProvider } from '../../services/service-provider';
import { ExportableByteRenderNodeBase } from '../../nodes/render-nodes/exportable-byte-render-node-base';
import { IDisplacementSource } from './displacement-source';
import { DisplacementRangeComputeNode } from '../../nodes/compute-nodes/displacement-range-compute-node';
import { DisplacementRadiusComputeNode } from '../../nodes/compute-nodes/displacement-radius-compute-node';
import { TerrainBase } from './terrain-base';

export class DisplacementSourceTerrain extends TerrainBase implements IDisplacementSource {

    private readonly _displacementOutput: Float32Array;
    private readonly _normalOutput?: Float32Array;

    protected readonly _material: MeshStandardMaterial;

    public get displacementMap(): Texture {
        return this._material.displacementMap!;
    }

    public get displacementRadius(): Int32Array {
        return this._displacementRadius;
    }

    public get displacementMin(): Int32Array {
        return this._displacementMin;
    }

    public get displacementMax(): Int32Array {
        return this._displacementMax;
    }

    constructor(
        _serviceProvider: IServiceProvider,
        meshSize: Vector2,
        vertexSizeMax: Vector2,
        vertexSizeMin: Vector2,
        meshLodDistance: number,
        flatShading: boolean,
        _diffuseRenderNode: ExportableByteRenderNodeBase,
        displacementTexture: ITextureSettings,
        private readonly _normalTangentSpaceRenderNode?: NormalTangentSpaceRenderNode) {
        super(_serviceProvider,
            _diffuseRenderNode,
            new Int32Array(1),
            new Int32Array(1),
            new Int32Array(1));

        this._displacementOutput = new Float32Array(displacementTexture.valuesLength);
        if (_normalTangentSpaceRenderNode) {
            this._normalOutput = new Float32Array(_normalTangentSpaceRenderNode.textureSettings.valuesLength);
        }

        const materialParameters: MeshStandardMaterialParameters = {
            displacementMap: TextureService.createDataTexture(this._displacementOutput, displacementTexture),
            displacementScale: 1,
            flatShading: flatShading,
            map: TextureService.createDataTexture(this._diffuseOutput, _diffuseRenderNode.textureSettings, true, _serviceProvider.settings.constants.anisotropy),
            metalness: 0,
            roughness: 1,
            side: _serviceProvider.settings.debug.side,
            wireframe: _serviceProvider.settings.debug.wireframe
        };
        if (_normalTangentSpaceRenderNode && this._normalOutput) {
            materialParameters.normalMap = TextureService.createDataTexture(this._normalOutput, _normalTangentSpaceRenderNode.textureSettings);
        }
        this._material = new MeshStandardMaterial(materialParameters);
        this.initializeMeshs(meshSize, vertexSizeMax, vertexSizeMin, meshLodDistance);
    }

    public async applyRunOutput(
        displacement: IDisplacementNode,
        range: DisplacementRangeComputeNode,
        radius: DisplacementRadiusComputeNode): Promise<void> {
        const promises: Promise<void>[] = [
            displacement.readOutputBuffer(this._displacementOutput),
            range.readOutputBuffer(this._displacementMin, this._displacementMax),
            radius.readOutputBuffer(this._displacementRadius)
        ];
        if (this._normalTangentSpaceRenderNode && this._normalOutput) {
            promises.push(this._normalTangentSpaceRenderNode.readOutputBuffer(this._normalOutput));
        }
        await this.updateTerrain(promises);
    }
}