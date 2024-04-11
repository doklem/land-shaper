import ComputeShader from '../../../shaders/compute/displacement-range.wgsl';
import { Vector2, Vector3 } from 'three';
import { IServiceProvider } from '../../services/service-provider';
import { TextureWrapper } from '../../services/texture-wrapper';
import { IMultiExportableNode } from '../multi-exportable-node';
import { ComputeNodeBase } from './compute-node-base';
import { BufferService } from '../../services/buffer-service';

export class DisplacementRangeComputeNode extends ComputeNodeBase implements IMultiExportableNode<Int32Array> {

    private static readonly WORKGROUP_SIZE = new Vector2(8, 8);
    private static readonly CLEAR_ARRAYS = [
        new Int32Array([2147483647]),
        new Int32Array([-2147483648])
    ];

    private readonly _minStagingBuffer: GPUBuffer;
    private readonly _maxStagingBuffer: GPUBuffer;

    protected override readonly _bindGroup: GPUBindGroup;
    protected override readonly _pipeline: GPUComputePipeline;

    public readonly minBuffer: GPUBuffer;
    public readonly maxBuffer: GPUBuffer;

    constructor(
        serviceProvider: IServiceProvider,
        displacementTexture: TextureWrapper) {
        super('Displacement Range',
            serviceProvider,
            new Vector3(Math.ceil(displacementTexture.settings.width / DisplacementRangeComputeNode.WORKGROUP_SIZE.x),
                Math.ceil(displacementTexture.settings.height / DisplacementRangeComputeNode.WORKGROUP_SIZE.y),
                1));

        // buffers
        let buffers = this.createExportableBuffer('Min Output', Int32Array.BYTES_PER_ELEMENT);
        this.minBuffer = buffers.buffer;
        this._minStagingBuffer = buffers.staging;
        
        buffers = this.createExportableBuffer('Max Output', Int32Array.BYTES_PER_ELEMENT);
        this.maxBuffer = buffers.buffer;
        this._maxStagingBuffer = buffers.staging;

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout(
            [
                {
                    binding: 0, // displacement texture
                    visibility: GPUShaderStage.COMPUTE,
                    texture: displacementTexture.bindingLayout,
                },
                {
                    binding: 1, // sampler
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: { type: displacementTexture.settings.samplerBinding },
                },
                {
                    binding: 2, // min output
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                {
                    binding: 3, // max output
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                }
            ]
        );

        // bind group
        this._bindGroup = this.createBindGroup(
            bindGroupLayout,
            [
                {
                    binding: 0,
                    resource: displacementTexture.view,
                },
                {
                    binding: 1,
                    resource: serviceProvider.textures.samplerLinearClamping,
                },
                {
                    binding: 2,
                    resource:
                    {
                        buffer: this.minBuffer
                    },
                },
                {
                    binding: 3,
                    resource:
                    {
                        buffer: this.maxBuffer
                    },
                }
            ]
        );

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, ComputeShader);
    }

    public configureRun(): void {
        this._serviceProvider.device.queue.writeBuffer(this.minBuffer, 0, DisplacementRangeComputeNode.CLEAR_ARRAYS[0]);
        this._serviceProvider.device.queue.writeBuffer(this.maxBuffer, 0, DisplacementRangeComputeNode.CLEAR_ARRAYS[1]);
    }

    public appendComputePass(commandEncoder: GPUCommandEncoder): void {
        super.appendComputePass(commandEncoder);
        commandEncoder.copyBufferToBuffer(this.minBuffer, 0, this._minStagingBuffer, 0, this.minBuffer.size);
        commandEncoder.copyBufferToBuffer(this.maxBuffer, 0, this._maxStagingBuffer, 0, this.maxBuffer.size);
    }

    public async readOutputBuffer(outputs: Int32Array[]): Promise<void> {
        if (outputs.length < 2) {
            throw new Error('The number of provided outputs does not match the number of staging buffers');
        }
        await Promise.all([
            outputs[0].set(new Int32Array(await BufferService.readGPUBuffer(this._minStagingBuffer))),
            outputs[1].set(new Int32Array(await BufferService.readGPUBuffer(this._maxStagingBuffer)))
        ]);
    }
};

