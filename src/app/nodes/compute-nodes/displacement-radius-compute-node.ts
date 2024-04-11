import ComputeShader from '../../../shaders/compute/displacement-radius.wgsl';
import { Vector2, Vector3 } from 'three';
import { IServiceProvider } from '../../services/service-provider';
import { TextureWrapper } from '../../services/texture-wrapper';
import { ComputeNodeBase } from './compute-node-base';
import { IExportableNode } from '../exportable-node';
import { BufferService } from '../../services/buffer-service';

export class DisplacementRadiusComputeNode extends ComputeNodeBase implements IExportableNode<Int32Array> {

    private static readonly WORKGROUP_SIZE = new Vector2(8, 8);

    private readonly _outputBuffer: GPUBuffer;
    private readonly _stagingBuffer: GPUBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected override readonly _bindGroup: GPUBindGroup;
    protected override readonly _pipeline: GPUComputePipeline;

    constructor(
        serviceProvider: IServiceProvider,
        displacementTexture: TextureWrapper,
        meshSize: Vector2,
        displacementMinBuffer: GPUBuffer,
        displacementMaxBuffer: GPUBuffer) {
        super('Displacement Radius',
            serviceProvider,
            new Vector3(Math.ceil(displacementTexture.settings.width / DisplacementRadiusComputeNode.WORKGROUP_SIZE.x),
                Math.ceil(displacementTexture.settings.height / DisplacementRadiusComputeNode.WORKGROUP_SIZE.y),
                1));

        // buffers
        const buffers = this.createExportableBuffer('Output', Int32Array.BYTES_PER_ELEMENT);
        this._outputBuffer = buffers.buffer;
        this._stagingBuffer = buffers.staging;
        this._uniformConfigBuffer = this.createUniformBuffer(Float32Array.BYTES_PER_ELEMENT * 4);
        serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, new Float32Array([meshSize.x, meshSize.y]))

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout(
            [
                {
                    binding: 0, // uniform config
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1, // displacement texture
                    visibility: GPUShaderStage.COMPUTE,
                    texture: displacementTexture.bindingLayout,
                },
                {
                    binding: 2, // sampler
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: { type: displacementTexture.settings.samplerBinding },
                },
                {
                    binding: 3, // min input
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' },
                },
                {
                    binding: 4, // max input
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 5, // output
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
                    resource:
                    {
                        buffer: this._uniformConfigBuffer
                    },
                },
                {
                    binding: 1,
                    resource: displacementTexture.view,
                },
                {
                    binding: 2,
                    resource: serviceProvider.textures.samplerLinearClamping,
                },
                {
                    binding: 3,
                    resource:
                    {
                        buffer: displacementMinBuffer
                    },
                },
                {
                    binding: 4,
                    resource:
                    {
                        buffer: displacementMaxBuffer
                    },
                },
                {
                    binding: 5,
                    resource:
                    {
                        buffer: this._outputBuffer
                    },
                }
            ]
        );

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, ComputeShader);
    }

    public appendComputePass(commandEncoder: GPUCommandEncoder): void {
        commandEncoder.clearBuffer(this._outputBuffer);
        super.appendComputePass(commandEncoder);
        commandEncoder.copyBufferToBuffer(this._outputBuffer, 0, this._stagingBuffer, 0, this._outputBuffer.size);
    }

    public async readOutputBuffer(output: Int32Array): Promise<void> {
        output.set(new Int32Array(await BufferService.readGPUBuffer(this._stagingBuffer)));
    }
};

