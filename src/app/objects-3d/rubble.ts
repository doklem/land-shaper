import {
    BufferGeometry,
    DynamicDrawUsage,
    InstancedBufferAttribute,
    InstancedMesh,
    LOD,
    MeshStandardMaterial,
    NormalBufferAttributes
} from 'three';
import { IDisposable } from '../disposable';
import { RubbleComputeNode } from '../nodes/compute-nodes/rubbel-compute-node';
import { IServiceProvider } from '../services/service-provider';
import { TextureService } from '../services/texture-service';

export class Rubble extends LOD implements IDisposable {

    private readonly _colorAttribute: InstancedBufferAttribute;
    private readonly _colorsOutput: Float32Array;
    private readonly _matricesOutput: Float32Array;
    private readonly _instanceMeshs: InstancedMesh<BufferGeometry<NormalBufferAttributes>, MeshStandardMaterial>[];

    public constructor(
        serviceProvider: IServiceProvider,
        meshLodDistance: number,
        private readonly _rubbleComputeNode: RubbleComputeNode) {
        super();
        this._colorsOutput = new Float32Array(this._rubbleComputeNode.size * TextureService.RGBA_PIXEL_LENGTH);
        this._matricesOutput = new Float32Array(this._rubbleComputeNode.size * TextureService.MATRIX_4X4_LENGTH);

        this._instanceMeshs = [];

        this._colorAttribute = new InstancedBufferAttribute(this._colorsOutput, TextureService.RGBA_PIXEL_LENGTH);
        this._colorAttribute.setUsage(DynamicDrawUsage);
        this._colorAttribute.needsUpdate = true;
        
        serviceProvider.meshs.rubbleGeometries.forEach((geometry: BufferGeometry<NormalBufferAttributes>, index: number) => {
            this.addInstancedMesh(geometry, serviceProvider.meshs.rubbleMaterial!, index * meshLodDistance);
        });
    }

    public async applyRunOutput(): Promise<void> {
        await this._rubbleComputeNode.readOutputBuffer(this._colorsOutput, this._matricesOutput);
        this._colorAttribute.needsUpdate = true;
        this._instanceMeshs.forEach(instancedMesh => {
            instancedMesh.instanceMatrix.copyArray(this._matricesOutput);
            instancedMesh.instanceMatrix.needsUpdate = true;
            instancedMesh.computeBoundingBox();
            instancedMesh.computeBoundingSphere();
        });
    }

    public dispose(): void {
        this._instanceMeshs.forEach(instancedMesh => instancedMesh.dispose());
    }

    private addInstancedMesh(geometry: BufferGeometry, material: MeshStandardMaterial, distance: number): void {
        const instancedMesh = new InstancedMesh<BufferGeometry<NormalBufferAttributes>, MeshStandardMaterial>(geometry, material, this._rubbleComputeNode.size);
        instancedMesh.instanceColor = this._colorAttribute;
        this._instanceMeshs.push(instancedMesh);
        this.addLevel(instancedMesh, distance);
    }
}