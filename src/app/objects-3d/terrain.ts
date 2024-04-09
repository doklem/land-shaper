import {
    DataTexture,
    LOD,
    Mesh,
    MeshStandardMaterial,
    MeshStandardMaterialParameters,
    PlaneGeometry,
    Vector2,
    Vector3
} from 'three';
import { TextureService } from '../services/texture-service';
import { IDisposable } from '../disposable';
import { NormalTangentSpaceRenderNode } from '../nodes/render-nodes/normal-tangent-space-render-node';
import { IExportableNode } from '../nodes/exportable-node';
import { ITextureSettings } from '../settings/texture-settings';
import { IServiceProvider } from '../services/service-provider';
import { ExportableByteRenderNodeBase } from '../nodes/render-nodes/exportable-byte-render-node-base';
import { IMultiExportableNode } from '../nodes/multi-exportable-node';
import { IDisplacementDefinition } from './displacement-definition';

export class Terrain extends LOD implements IDisposable, IDisplacementDefinition {

    private readonly _diffuseOutput?: Uint8Array;
    private readonly _displacementMap: DataTexture;
    private readonly _displacementOutput?: Float32Array;
    private readonly _displacementRadius: Int32Array[];
    private readonly _displacementRange: Int32Array[];
    private readonly _material: MeshStandardMaterial;
    private readonly _meshs: Mesh[];
    private readonly _normalOutput?: Float32Array;

    public get displacementMap(): DataTexture {
        return this._displacementMap;
    }

    public get displacementRadius(): Int32Array[] {
        return this._displacementRadius;
    }

    public get displacementRange(): Int32Array[] {
        return this._displacementRange;
    }

    constructor(
        private readonly _serviceProvider: IServiceProvider,
        meshSize: Vector2,
        vertexSizeMax: Vector2,
        vertexSizeMin: Vector2,
        meshLodDistance: number,
        flatShading: boolean,
        private readonly _normalTangentSpaceRenderNode?: NormalTangentSpaceRenderNode,
        private readonly _diffuseRenderNode?: ExportableByteRenderNodeBase,
        displacementTexture?: ITextureSettings,
        displacement?: IDisplacementDefinition) {
        super();

        if (displacementTexture) {
            this._displacementOutput = new Float32Array(displacementTexture.valuesLength);
            this._displacementMap = TextureService.createDataTexture(this._displacementOutput, displacementTexture);
            this._displacementRadius = [
                new Int32Array(_serviceProvider.textures.displacementRadius.size)
            ];
            this._displacementRange = [
                new Int32Array(_serviceProvider.textures.displacementRange.size),
                new Int32Array(_serviceProvider.textures.displacementRange.size)
            ];
        } else if (displacement) {
            this._displacementMap = displacement.displacementMap;
            this._displacementRadius = displacement.displacementRadius;
            this._displacementRange = displacement.displacementRange;
        } else {
            throw new Error('No displacement source was provided')
        }
        const displacementAverage = new Vector3(0, 0, (this._displacementRange[0][0] + this._displacementRange[1][0]) * 0.5);

        if (_normalTangentSpaceRenderNode) {
            this._normalOutput = new Float32Array(_normalTangentSpaceRenderNode.textureSettings.valuesLength);
        }

        if (_diffuseRenderNode) {
            this._diffuseOutput = new Uint8Array(_diffuseRenderNode.textureSettings.valuesLength);
        }

        const materialParameters: MeshStandardMaterialParameters = {
            displacementMap: this._displacementMap,
            displacementScale: 1,
            flatShading: flatShading,
            metalness: 0,
            roughness: 1,
            side: _serviceProvider.settings.debug.side,
            wireframe: _serviceProvider.settings.debug.wireframe
        };
        if (_diffuseRenderNode) {
            materialParameters.map = TextureService.createDataTexture(this._diffuseOutput!, _diffuseRenderNode.textureSettings, _serviceProvider.settings.constants.anisotropy);
        }
        if (_normalTangentSpaceRenderNode) {
            materialParameters.normalMap = TextureService.createDataTexture(this._normalOutput!, _normalTangentSpaceRenderNode.textureSettings);
        }
        this._material = new MeshStandardMaterial(materialParameters);

        this._meshs = [];
        let factor = 1;
        let lodLevel = 0;
        while (true) {
            const lodVertexSize = vertexSizeMax.clone().multiplyScalar(factor).round();
            if (lodVertexSize.x < vertexSizeMin.x && lodVertexSize.y < vertexSizeMin.y) {
                break;
            }
            const mesh = new Mesh(
                new PlaneGeometry(
                    meshSize.x,
                    meshSize.y,
                    Math.max(vertexSizeMin.x, lodVertexSize.x),
                    Math.max(vertexSizeMin.y, lodVertexSize.y)),
                this._material);
            mesh.castShadow = false;
            mesh.receiveShadow = true;
            this._meshs.push(mesh);
            this.setBoundingShpere(mesh, displacementAverage);
            this.addLevel(mesh, lodLevel * meshLodDistance);
            factor *= 0.5;
            lodLevel++;
        }
    }

    public async applyRunOutput(
        displacementProviders?: {
            displacement: IExportableNode<Float32Array>,
            range: IMultiExportableNode<Int32Array>,
            radius: IMultiExportableNode<Int32Array>
        }): Promise<void> {
        const promises: Promise<void>[] = [];
        if (displacementProviders && this._displacementOutput) {
            promises.push(displacementProviders.displacement.readOutputBuffer(this._displacementOutput));
            promises.push(displacementProviders.range.readOutputBuffer(this._displacementRange));
            promises.push(displacementProviders.radius.readOutputBuffer(this._displacementRadius));
        }
        if (this._normalTangentSpaceRenderNode && this._normalOutput) {
            promises.push(this._normalTangentSpaceRenderNode.readOutputBuffer(this._normalOutput));
        }
        if (this._diffuseRenderNode && this._diffuseOutput) {
            promises.push(this._diffuseRenderNode.readOutputBuffer(this._diffuseOutput));
        }
        if (promises.length > 0) {
            await Promise.all(promises);
        }

        if (this._displacementOutput && this._material.displacementMap) {
            this._material.displacementMap.needsUpdate = true;
        }
        if (this._normalTangentSpaceRenderNode && this._material.normalMap) {
            this._material.normalMap.needsUpdate = true;
        }
        if (this._diffuseRenderNode && this._material.map) {
            this._material.map.needsUpdate = true;
        }
        this._material.needsUpdate = true;

        if (displacementProviders) {
            const displacementAverage = new Vector3(0, 0, (this._displacementRange[0][0] + this._displacementRange[1][0]) * 0.5);
            this._meshs.forEach(mesh => this.setBoundingShpere(mesh, displacementAverage));
        }
    }

    public applyDebugSettings(): void {
        this._material.side = this._serviceProvider.settings.debug.side;
        this._material.wireframe = this._serviceProvider.settings.debug.wireframe;
        this._material.needsUpdate = true;
    }

    public dispose(): void {
        TextureService.disposeMaterialTextures(this._material);
        this._material.dispose();
        this._meshs.forEach(mesh => mesh.geometry.dispose());
    }

    public async updateDiffuse(): Promise<void> {
        if (!this._diffuseRenderNode) {
            return;
        }
        await this._diffuseRenderNode.readOutputBuffer(this._diffuseOutput!);
        this._material.map!.needsUpdate = true;
        this._material.needsUpdate = true;
    }

    private setBoundingShpere(mesh: Mesh, displacementAverage: Vector3): void {
        mesh.geometry.computeBoundingSphere();
        mesh.geometry.boundingSphere!.radius = this._displacementRadius[0][0];
        mesh.geometry.boundingSphere!.center.add(displacementAverage);
    }
}