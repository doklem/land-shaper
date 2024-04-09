import ComputeShader from '../../../shaders/compute/displacement-radius.wgsl';
import { Vector2, Vector3 } from 'three';
import { IDisposable } from '../../disposable';
import { ExportableIntComputeNodeBase } from './exportable-int-compute-node-base';
import { IServiceProvider } from '../../services/service-provider';
import { TextureWrapper } from '../../services/texture-wrapper';

export class DisplacementRadiusComputeNode extends ExportableIntComputeNodeBase implements IDisposable {

    private static readonly WORKGROUP_SIZE = new Vector2(8, 8);

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
                1),
            [serviceProvider.textures.displacementRadius]);

        // buffers
        this._uniformConfigBuffer = serviceProvider.device.createBuffer({
            label: `${this._name} Uniform Config Buffer`,
            size: Float32Array.BYTES_PER_ELEMENT * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });
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
                        buffer: this.outputBuffers[0]
                    },
                }
            ]
        );

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, ComputeShader);
    }

    public appendComputePass(commandEncoder: GPUCommandEncoder): void {
        commandEncoder.clearBuffer(this.outputBuffers[0]);
        super.appendComputePass(commandEncoder);
    }

    public override dispose(): void {
        super.dispose();
        this._uniformConfigBuffer.destroy();
    }
};

