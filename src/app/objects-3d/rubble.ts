import {
    BufferGeometry,
    DynamicDrawUsage,
    InstancedBufferAttribute,
    InstancedMesh,
    LOD,
    Matrix4,
    MeshStandardMaterial,
    NormalBufferAttributes
} from 'three';
import { IDisposable } from '../disposable';
import { RubbleComputeNode } from '../nodes/compute-nodes/rubbel-compute-node';
import { IServiceProvider } from '../services/service-provider';

export class Rubble extends LOD implements IDisposable {

    public static readonly RGBA_LENGTH = 4;
    public static readonly MATRIX_LENGTH = Matrix4.length;
    public static readonly ITEM_LENGTH = Rubble.RGBA_LENGTH + Rubble.MATRIX_LENGTH;
    public static readonly ITEM_BYTE_LENGTH = Float32Array.BYTES_PER_ELEMENT * Rubble.ITEM_LENGTH;

    private readonly _matricesLength: number;
    private readonly _instanceMeshs: InstancedMesh<BufferGeometry<NormalBufferAttributes>, MeshStandardMaterial>[];
    private readonly _colorAttribute: InstancedBufferAttribute;
    private readonly _rubbleOutput: Float32Array;

    public constructor(
        serviceProvider: IServiceProvider,
        meshLodDistance: number,
        private readonly _rubbleComputeNode: RubbleComputeNode) {
        super();
        this._rubbleOutput = new Float32Array(this._rubbleComputeNode.textureSettings.valuesLength);

        this._matricesLength = this._rubbleComputeNode.textureSettings.size * Rubble.MATRIX_LENGTH;
        this._instanceMeshs = [];

        this._colorAttribute = new InstancedBufferAttribute(new Float32Array(this._rubbleComputeNode.textureSettings.size * Rubble.RGBA_LENGTH), Rubble.RGBA_LENGTH);
        this._colorAttribute.setUsage(DynamicDrawUsage);
        this._colorAttribute.needsUpdate = true;
        
        serviceProvider.meshs.rubbleGeometries.forEach((geometry: BufferGeometry<NormalBufferAttributes>, index: number) => {
            this.addInstancedMesh(geometry, serviceProvider.meshs.rubbleMaterial!, index * meshLodDistance);
        });
    }

    public async applyRunOutput(): Promise<void> {
        await this._rubbleComputeNode.readOutputBuffer(this._rubbleOutput);

        this._colorAttribute.copyArray(this._rubbleOutput.subarray(this._matricesLength));
        this._colorAttribute.needsUpdate = true;
        
        const matrices = this._rubbleOutput.subarray(0, this._matricesLength);
        this._instanceMeshs.forEach(instancedMesh => {
            instancedMesh.instanceMatrix.copyArray(matrices);
            instancedMesh.instanceMatrix.needsUpdate = true;
            instancedMesh.computeBoundingBox();
            instancedMesh.computeBoundingSphere();
        });
    }

    public dispose(): void {
        this._instanceMeshs.forEach(instancedMesh => instancedMesh.dispose());
    }

    private addInstancedMesh(geometry: BufferGeometry, material: MeshStandardMaterial, distance: number): void {
        const instancedMesh = new InstancedMesh<BufferGeometry<NormalBufferAttributes>, MeshStandardMaterial>(geometry, material, this._rubbleComputeNode.textureSettings.size);
        instancedMesh.instanceColor = this._colorAttribute;
        this._instanceMeshs.push(instancedMesh);
        this.addLevel(instancedMesh, distance);
    }
}