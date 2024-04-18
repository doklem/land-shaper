import {
    LOD,
    Mesh,
    MeshStandardMaterial,
    PlaneGeometry,
    Vector2,
    Vector3
} from 'three';
import { TextureService } from '../../services/texture-service';
import { IDisposable } from '../../disposable';
import { IServiceProvider } from '../../services/service-provider';
import { ExportableByteRenderNodeBase } from '../../nodes/render-nodes/exportable-byte-render-node-base';

export abstract class TerrainBase extends LOD implements IDisposable {
    
    private readonly _meshs: Mesh[];

    protected readonly _diffuseOutput: Uint8Array;
    protected abstract readonly _material: MeshStandardMaterial;

    constructor(
        protected readonly _serviceProvider: IServiceProvider,
        protected readonly _diffuseRenderNode: ExportableByteRenderNodeBase,
        protected readonly _displacementRadius: Int32Array,
        protected readonly _displacementMin: Int32Array,
        protected readonly _displacementMax: Int32Array) {
        super();
        this._diffuseOutput = new Uint8Array(_diffuseRenderNode.textureSettings.valuesLength);
        this._meshs = [];
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

    protected initializeMeshs(
        meshSize: Vector2,
        vertexSizeMax: Vector2,
        vertexSizeMin: Vector2,
        meshLodDistance: number): void {
        const displacementAverage = new Vector3(0, 0, (this._displacementMin[0] + this._displacementMax[0]) * 0.5);
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

    protected async updateTerrain(outputReadingTasks: Promise<void>[]): Promise<void> {
        outputReadingTasks.push(this._diffuseRenderNode.readOutputBuffer(this._diffuseOutput));
        await Promise.all(outputReadingTasks);
        
        if (this._material.normalMap) {
            this._material.normalMap.needsUpdate = true;
        }
        this._material.displacementMap!.needsUpdate = true;
        this._material.map!.needsUpdate = true;
        this._material.needsUpdate = true;

        const displacementAverage = new Vector3(0, 0, (this._displacementMin[0] + this._displacementMax[0]) * 0.5);
        this._meshs.forEach(mesh => this.setBoundingShpere(mesh, displacementAverage));
    }

    private setBoundingShpere(mesh: Mesh, displacementAverage: Vector3): void {
        mesh.geometry.computeBoundingSphere();
        mesh.geometry.boundingSphere!.radius = this._displacementRadius[0];
        mesh.geometry.boundingSphere!.center.add(displacementAverage);
    }
}