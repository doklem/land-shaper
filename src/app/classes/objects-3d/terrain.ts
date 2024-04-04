import {
    DataTexture,
    LOD,
    Mesh,
    MeshStandardMaterial,
    MeshStandardMaterialParameters,
    PlaneGeometry,
    Vector2
} from 'three';
import { TextureService } from '../services/texture-service';
import { IDisposable } from '../disposable';
import { NormalTangentSpaceRenderNode } from '../nodes/render-nodes/normal-tangent-space-render-node';
import { IExportableNode } from '../nodes/exportable-node';
import { ITextureSettings } from '../settings/texture-settings';
import { IServiceProvider } from '../services/service-provider';
import { ExportableByteRenderNodeBase } from '../nodes/render-nodes/exportable-byte-render-node-base';

export class Terrain extends LOD implements IDisposable {

    private readonly _diffuseOutput?: Uint8Array;
    private readonly _displacementOutput?: Float32Array;
    private readonly _material: MeshStandardMaterial;
    private readonly _meshs: Mesh[];
    private readonly _normalOutput?: Float32Array;
    private readonly _displacementMap: DataTexture;

    public get displacementMap(): DataTexture {
        return this._displacementMap;
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
        displacementMap?: DataTexture) {
        super();

        if (displacementTexture) {
            this._displacementOutput = new Float32Array(displacementTexture.length);
        }
        if (_normalTangentSpaceRenderNode) {
            this._normalOutput = new Float32Array(_normalTangentSpaceRenderNode.textureSettings.length);
        }
        if (_diffuseRenderNode) {
            this._diffuseOutput = new Uint8Array(_diffuseRenderNode.textureSettings.length);
        }

        this._displacementMap = displacementMap ?? TextureService.createDataTexture(this._displacementOutput!, displacementTexture!);
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
            this.addLevel(mesh, lodLevel * meshLodDistance);
            factor *= 0.5;
            lodLevel++;
        }
    }

    public async applyRunOutput(displacementProvider?: IExportableNode<Float32Array> | undefined): Promise<void> {
        const promises: Promise<void>[] = [];
        if (displacementProvider && this._displacementOutput) {
            promises.push(displacementProvider.readOutputBuffer(this._displacementOutput));
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

        if (this._displacementOutput) {
            this._material.displacementMap!.needsUpdate = true;
        }
        if (this._normalTangentSpaceRenderNode) {
            this._material.normalMap!.needsUpdate = true;
        }
        if (this._diffuseRenderNode) {
            this._material.map!.needsUpdate = true;
        }
        this._material.needsUpdate = true;

        this._meshs.forEach(mesh => {
            mesh.geometry.computeBoundingBox();
            mesh.geometry.computeBoundingSphere();
        });
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
}