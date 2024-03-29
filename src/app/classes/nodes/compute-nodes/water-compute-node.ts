import ComputeShader from './../../../shaders/water-compute.wgsl';
import { TextureService } from '../../services/texture-service';
import { Vector2 } from 'three';
import { QuadTree } from './quad-tree';
import { ComputeNodeBase } from './compute-node-base';
import { IServiceProvider } from '../../services/service-provider';

export class WaterComputeNode extends ComputeNodeBase {

    private static readonly WORKGROUP_SIZE = 64;

    public static readonly NAME = 'Water';

    private readonly _workgroupSize: number;
    private readonly _uniformConfigBuffer: GPUBuffer;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _dropletIterationsBuffer: GPUBuffer;
    private readonly _dropletOffsetsBuffer: GPUBuffer;
    private readonly _dropletOriginsBuffer: GPUBuffer;

    protected override readonly _bindGroup: GPUBindGroup;
    protected override readonly _pipeline: GPUComputePipeline;

    public constructor(serviceProvider: IServiceProvider) {
        super(
            WaterComputeNode.NAME,
            serviceProvider,
            WaterComputeNode.getWorkgroupCount(serviceProvider.device, serviceProvider.textures),
            serviceProvider.textures.water.settings);

        this._workgroupSize = serviceProvider.settings.constants.erosion.dropletsSize.x * serviceProvider.settings.constants.erosion.dropletsSize.y;

        // buffers
        this._uniformConfigArray = new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * 3 + Float32Array.BYTES_PER_ELEMENT * 5);
        this._uniformConfigBuffer = serviceProvider.device.createBuffer({
            label: `${this._name} Uniform Config Buffer`,
            size: this._uniformConfigArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });

        const dropletOriginsArray = this.createDropletOrigins();
        this._dropletOriginsBuffer = serviceProvider.device.createBuffer({
            label: `${this._name} Droplet Origins Buffer`,
            size: dropletOriginsArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });
        serviceProvider.device.queue.writeBuffer(this._dropletOriginsBuffer, 0, dropletOriginsArray);

        const dropletOffsetsArray = this.createDropletOffsets(serviceProvider.settings.constants.erosion.dropletOffsetsMinSize)
        this._dropletOffsetsBuffer = serviceProvider.device.createBuffer({
            label: `${this._name} Droplet Offsets Buffer`,
            size: dropletOffsetsArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });
        serviceProvider.device.queue.writeBuffer(this._dropletOffsetsBuffer, 0, dropletOffsetsArray);

        this._dropletIterationsBuffer = serviceProvider.device.createBuffer({
            label: `${this._name} Droplet Iterations Buffer`,
            size: this._workgroupSize * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout(
            [
                {
                    binding: 0, // config uniforms
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1, // droplet origins
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 2, // droplet offsets
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 3, // droplet iterations
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                {
                    binding: 4, // displacement
                    visibility: GPUShaderStage.COMPUTE,
                    texture: serviceProvider.textures.displacementFinal.bindingLayout,
                },
                {
                    binding: 5, // float sampler
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: { type: serviceProvider.textures.displacementFinal.settings.samplerBinding },
                },
                {
                    binding: 6, // water
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
            ]
        );

        // bind group
        this._bindGroup = this.createBindGroup(
            bindGroupLayout,
            [
                {
                    binding: 0,
                    resource: { buffer: this._uniformConfigBuffer },
                },
                {
                    binding: 1,
                    resource: { buffer: this._dropletOriginsBuffer },
                },
                {
                    binding: 2,
                    resource: { buffer: this._dropletOffsetsBuffer },
                },
                {
                    binding: 3,
                    resource: { buffer: this._dropletIterationsBuffer },
                },
                {
                    binding: 4,
                    resource: serviceProvider.textures.displacementFinal.view,
                },
                {
                    binding: 5,
                    resource: serviceProvider.textures.floatSampler,
                },
                {
                    binding: 6,
                    resource: { buffer: this.outputBuffer },
                },
            ]
        );

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, ComputeShader);
    }

    public override appendComputePass(commandEncoder: GPUCommandEncoder): void {
        commandEncoder.clearBuffer(this.outputBuffer);
        super.appendComputePass(commandEncoder);
    }

    public configureRun(): void {
        const constants = this._serviceProvider.settings.constants;
        const erosion = this._serviceProvider.settings.erosion;
        const view = new DataView(this._uniformConfigArray);
        let offset = 0;
        view.setUint32(offset, this._serviceProvider.textures.displacementFinal.width, constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        view.setUint32(offset, this._serviceProvider.textures.displacementFinal.height, constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        view.setUint32(offset, erosion.maxLifetime, constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.inertia, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.evaporateSpeed, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.gravity, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.startSpeed, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.startWater, constants.littleEndian);
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);

        const dropletIterationsArray = new Uint32Array(this._dropletIterationsBuffer.size / Uint32Array.BYTES_PER_ELEMENT);
        offset = 0;
        for (let i = 0; i < dropletIterationsArray.length; i++) {
            dropletIterationsArray.set([offset], i);
            offset += 4;
        }
        this._serviceProvider.device.queue.writeBuffer(this._dropletIterationsBuffer, 0, dropletIterationsArray);
    }

    public override dispose(): void {
        super.dispose();
        this._uniformConfigBuffer.destroy();
    }

    protected override appendToCommandEncoder(commandEncoder: GPUCommandEncoder): void {
        this.appendCopyOutputToTexture(commandEncoder, this._serviceProvider.textures.water);
    }

    private createDropletOrigins(): Uint32Array {
        const dropletOriginArea = new Vector2(
            this._serviceProvider.textures.displacementFinal.width / this._serviceProvider.settings.constants.erosion.dropletsSize.x,
            this._serviceProvider.textures.displacementFinal.height / this._serviceProvider.settings.constants.erosion.dropletsSize.y);

        const originIndices: number[] = [];
        let coordinate = new Vector2();
        for (let y = 0; y < this._serviceProvider.settings.constants.erosion.dropletsSize.y; y++) {
            for (let x = 0; x < this._serviceProvider.settings.constants.erosion.dropletsSize.x; x++) {
                originIndices.push(coordinate.y * this._serviceProvider.textures.displacementFinal.width + coordinate.x);
                coordinate.setX(coordinate.x + dropletOriginArea.x);
            }
            coordinate.set(0, coordinate.y + dropletOriginArea.y);
        }

        return new Uint32Array(originIndices);
    }

    private createDropletOffsets(minSize: number): Float32Array {
        const dropletOriginArea = new Vector2(
            this._serviceProvider.textures.displacementFinal.width / this._serviceProvider.settings.constants.erosion.dropletsSize.x,
            this._serviceProvider.textures.displacementFinal.height / this._serviceProvider.settings.constants.erosion.dropletsSize.y);
        const quadTree = new QuadTree(new Vector2(), dropletOriginArea, minSize);
        const offsets: number[] = [];
        const totalOffsets = dropletOriginArea.x * dropletOriginArea.y;
        let coordinate: Vector2;
        for (let i = 0; i < totalOffsets; i++) {
            coordinate = quadTree.nextPosition();
            offsets.push(coordinate.x);
            offsets.push(coordinate.y);
        }
        return new Float32Array(offsets);
    }

    private static getWorkgroupCount(device: GPUDevice, textures: TextureService): number {
        // Each pixel should be exactly once the origin of a droplet with this.
        const workgroupCount = (textures.water.settings.width * textures.water.settings.height) / WaterComputeNode.WORKGROUP_SIZE;
        return Math.min(workgroupCount, device.limits.maxComputeWorkgroupsPerDimension);
    }
}