import ComputeShader from '../../../shaders/compute/droplet-erosion.wgsl';
import { Vector2, Vector3 } from 'three';
import { QuadTree } from './quad-tree';
import { IServiceProvider } from '../../services/service-provider';
import { ComputeNodeBase } from './compute-node-base';

export class DropletErosionComputeNode extends ComputeNodeBase {

    private static readonly NAME = 'Droplet Erosion';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _brushBuffer: GPUBuffer;
    private readonly _displacementBedrockBuffer: GPUBuffer;
    private readonly _displacementSedimentBuffer: GPUBuffer;
    private readonly _dropletIterationsBuffer: GPUBuffer;
    private readonly _dropletOffsetsBuffer: GPUBuffer;
    private readonly _dropletOriginsBuffer: GPUBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;
    private readonly _uniformConfigArray: ArrayBuffer;

    //private readonly _debugClearBuffer: GPUBuffer;

    protected override readonly _pipeline: GPUComputePipeline;

    public constructor(_serviceProvider: IServiceProvider) {
        super(DropletErosionComputeNode.NAME, _serviceProvider, new Vector3());

        /*this._debugClearBuffer = _serviceProvider.device.createBuffer({
            label: `${this._name} Debug Clear Buffer`,
            size: _serviceProvider.textures.displacementErosionDifference.byteLength,
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.UNIFORM
        });*/

        // buffers
        this._uniformConfigArray = new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * 5
            + Float32Array.BYTES_PER_ELEMENT * 8
            + Float32Array.BYTES_PER_ELEMENT); // WebGPU byte padding
        this._uniformConfigBuffer = this.createUniformBuffer(this._uniformConfigArray.byteLength);

        const dropletOriginsArray = this.createDropletOrigins();
        this._dropletOriginsBuffer = this.createBuffer(
            'Droplet Origins',
            dropletOriginsArray.byteLength,
            GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE);
        _serviceProvider.device.queue.writeBuffer(this._dropletOriginsBuffer, 0, dropletOriginsArray);

        const dropletOffsetsArray = this.createDropletOffsets();
        this._dropletOffsetsBuffer = this.createBuffer(
            'Droplet Offsets',
            dropletOffsetsArray.byteLength,
            GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE);
        _serviceProvider.device.queue.writeBuffer(this._dropletOffsetsBuffer, 0, dropletOffsetsArray);

        this._dropletIterationsBuffer = this.createBuffer(
            'Droplet Iterations',
            _serviceProvider.settings.constants.dropletErosion.dropletsSize.x * _serviceProvider.settings.constants.dropletErosion.dropletsSize.y * Uint32Array.BYTES_PER_ELEMENT,
            GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE);

        const brush = DropletErosionComputeNode.createBrush(_serviceProvider.settings.constants.dropletErosion.brushRadius);
        this._brushBuffer = this.createBuffer(
            'Brush',
            brush.byteLength,
            GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE);
        _serviceProvider.device.queue.writeBuffer(this._brushBuffer, 0, brush);

        this._displacementBedrockBuffer = this.createBuffer(
            'Displacement Bedrock',
            _serviceProvider.textures.displacementErosionBedrock.byteLength,
            GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE);

        this._displacementSedimentBuffer = this.createBuffer(
            'Displacement Sediment',
            _serviceProvider.textures.displacementErosionSediment.byteLength,
            GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE);

        this.initialize();

        // bind group layout
        const bindGroupLayout = _serviceProvider.device.createBindGroupLayout({
            label: `${this._name} Bind Group Layout`,
            entries: [
                {
                    binding: 0, // config uniforms
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1, // brush
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 2, // droplet origins
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 3, // droplet offsets
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 4, // random states
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                {
                    binding: 5, // displacement bedrock
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                {
                    binding: 6, // displacement sediment
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                /*{
                    binding: 7,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture:
                    {
                        format: _serviceProvider.textures.displacementErosionDifference.settings.format,
                        access: 'write-only',
                        viewDimension: _serviceProvider.textures.displacementErosionDifference.bindingLayout.viewDimension,
                    },
                },*/
            ]
        });

        // bind group
        this._bindGroup = this._serviceProvider.device.createBindGroup({
            label: `${this._name} Bind Group`,
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this._uniformConfigBuffer },
                },
                {
                    binding: 1,
                    resource: { buffer: this._brushBuffer },
                },
                {
                    binding: 2,
                    resource: { buffer: this._dropletOriginsBuffer },
                },
                {
                    binding: 3,
                    resource: { buffer: this._dropletOffsetsBuffer },
                },
                {
                    binding: 4,
                    resource: { buffer: this._dropletIterationsBuffer },
                },
                {
                    binding: 5,
                    resource: { buffer: this._displacementBedrockBuffer },
                },
                {
                    binding: 6,
                    resource: { buffer: this._displacementSedimentBuffer },
                },
                /*{
                    binding: 7,
                    resource: _serviceProvider.textures.displacementErosionDifference.view,
                },*/
            ]
        });

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, ComputeShader);
    }

    public appendComputePass(commandEncoder: GPUCommandEncoder): void {
        /*commandEncoder.copyBufferToTexture(
            {
                buffer: this._debugClearBuffer,
                bytesPerRow: this._serviceProvider.textures.displacementErosionDifference.bytesPerRow,
            },
            this._serviceProvider.textures.displacementErosionDifference,
            this._serviceProvider.textures.displacementErosionDifference
        );*/
        const computePassEncoder = commandEncoder.beginComputePass();
        computePassEncoder.setPipeline(this._pipeline);
        computePassEncoder.setBindGroup(0, this._bindGroup);
        for (let i = 0; i < this._serviceProvider.settings.dropletErosion.iterations; i++) {
            computePassEncoder.dispatchWorkgroups(this._serviceProvider.settings.constants.dropletErosion.dropletsWorkgroupCount);
        }
        computePassEncoder.end();
        commandEncoder.copyBufferToTexture(
            {
                buffer: this._displacementBedrockBuffer,
                bytesPerRow: this._serviceProvider.textures.displacementErosionBedrock.bytesPerRow,
            },
            this._serviceProvider.textures.displacementErosionBedrock,
            this._serviceProvider.textures.displacementErosionBedrock);
        commandEncoder.copyBufferToTexture(
            {
                buffer: this._displacementSedimentBuffer,
                bytesPerRow: this._serviceProvider.textures.displacementErosionSediment.bytesPerRow,
            },
            this._serviceProvider.textures.displacementErosionSediment,
            this._serviceProvider.textures.displacementErosionSediment);
    }

    public configureRun(): void {
        const constants = this._serviceProvider.settings.constants;
        const erosion = this._serviceProvider.settings.dropletErosion;
        const view = new DataView(this._uniformConfigArray);
        let offset = 0;
        view.setUint32(offset, this._serviceProvider.textures.displacementErosion.width, constants.littleEndian);
        offset += Uint32Array.BYTES_PER_ELEMENT;
        view.setUint32(offset, this._serviceProvider.textures.displacementErosion.height, constants.littleEndian);
        offset += Uint32Array.BYTES_PER_ELEMENT;
        view.setInt32(offset, constants.dropletErosion.brushRadius, constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        view.setUint32(offset, erosion.maxLifetime, constants.littleEndian);
        offset += Uint32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.inertia, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.sedimentCapacityFactor, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.minSedimentCapacity, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.depositSpeed, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.erodeSpeed, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.evaporateSpeed, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.gravity, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.startSpeed, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.startWater, constants.littleEndian);
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public initialize(): void {
        const commandEncoder = this._serviceProvider.device.createCommandEncoder();
        commandEncoder.copyTextureToBuffer(
            this._serviceProvider.textures.displacementErosionBedrock,
            {
                buffer: this._displacementBedrockBuffer,
                bytesPerRow: this._serviceProvider.textures.displacementErosionBedrock.bytesPerRow
            },
            this._serviceProvider.textures.displacementErosionBedrock);
        commandEncoder.copyTextureToBuffer(
            this._serviceProvider.textures.displacementErosionSediment,
            {
                buffer: this._displacementSedimentBuffer,
                bytesPerRow: this._serviceProvider.textures.displacementErosionSediment.bytesPerRow
            },
            this._serviceProvider.textures.displacementErosionSediment);
        this._serviceProvider.device.queue.submit([commandEncoder.finish()]);
        const dropletIterationsArray = new Uint32Array(this._dropletIterationsBuffer.size / Uint32Array.BYTES_PER_ELEMENT);
        let offset = 0;
        for (let i = 0; i < dropletIterationsArray.length; i++) {
            dropletIterationsArray.set([offset], i);
            offset += 4;
        }
        this._serviceProvider.device.queue.writeBuffer(this._dropletIterationsBuffer, 0, dropletIterationsArray);
    }

    private static createBrush(radius: number): Float32Array {
        const offsetsAndWeights: number[] = [];
        const inclusiveDiameter = radius + radius + 1;
        offsetsAndWeights.length = inclusiveDiameter * inclusiveDiameter;
        offsetsAndWeights.fill(0);
        let offset = 0;
        let sum = 0;
        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                const sqrDst = x * x + y * y;
                if (sqrDst < radius * radius) {
                    const weight = 1 - Math.sqrt(sqrDst) / radius;
                    sum += weight;
                    offsetsAndWeights[offset] = weight;
                }
                offset++;
            }
        }
        return new Float32Array(offsetsAndWeights.map(weight => weight / sum));
    }

    private createDropletOrigins(): Uint32Array {
        const dropletOriginArea = new Vector2(
            this._serviceProvider.textures.displacementErosion.width / this._serviceProvider.settings.constants.dropletErosion.dropletsSize.x,
            this._serviceProvider.textures.displacementErosion.height / this._serviceProvider.settings.constants.dropletErosion.dropletsSize.y);

        const originIndices: number[] = [];
        let coordinate = new Vector2();
        for (let y = 0; y < this._serviceProvider.settings.constants.dropletErosion.dropletsSize.y; y++) {
            for (let x = 0; x < this._serviceProvider.settings.constants.dropletErosion.dropletsSize.x; x++) {
                originIndices.push(coordinate.y * this._serviceProvider.textures.displacementErosion.width + coordinate.x);
                coordinate.setX(coordinate.x + dropletOriginArea.x);
            }
            coordinate.set(0, coordinate.y + dropletOriginArea.y);
        }

        return new Uint32Array(originIndices);
    }

    private createDropletOffsets(): Float32Array {
        const dropletOriginArea = new Vector2(
            this._serviceProvider.textures.displacementErosion.width / this._serviceProvider.settings.constants.dropletErosion.dropletsSize.x,
            this._serviceProvider.textures.displacementErosion.height / this._serviceProvider.settings.constants.dropletErosion.dropletsSize.y);
        const quadTree = new QuadTree(new Vector2(), dropletOriginArea, this._serviceProvider.settings.constants.dropletErosion.dropletOffsetsMinSize);
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
}