import ComputeShader from '../../../shaders/compute/displacement-range.wgsl';
import { Vector2, Vector3 } from 'three';
import { IDisposable } from '../../disposable';
import { ExportableIntComputeNodeBase } from './exportable-int-compute-node-base';
import { IServiceProvider } from '../../services/service-provider';
import { TextureWrapper } from '../../services/texture-wrapper';

export class DisplacementRangeComputeNode extends ExportableIntComputeNodeBase implements IDisposable {

    private static readonly WORKGROUP_SIZE = new Vector2(8, 8);

    private readonly _clearArrays: Int32Array[];

    protected override readonly _bindGroup: GPUBindGroup;
    protected override readonly _pipeline: GPUComputePipeline;

    constructor(
        serviceProvider: IServiceProvider,
        displacementTexture: TextureWrapper) {
        super('Displacement Range',
            serviceProvider,
            new Vector3(Math.ceil(displacementTexture.settings.width / DisplacementRangeComputeNode.WORKGROUP_SIZE.x),
                Math.ceil(displacementTexture.settings.height / DisplacementRangeComputeNode.WORKGROUP_SIZE.y),
                1),
            [serviceProvider.textures.displacementRange, serviceProvider.textures.displacementRange]);

        this._clearArrays = [
            new Int32Array([2147483647]),
            new Int32Array([-2147483648])
        ];

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
                        buffer: this.outputBuffers[0]
                    },
                },
                {
                    binding: 3,
                    resource:
                    {
                        buffer: this.outputBuffers[1]
                    },
                }
            ]
        );

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, ComputeShader);
    }

    public configureRun(): void {
        this.outputBuffers.forEach(
            (outputBuffer: GPUBuffer, index: number) => this._serviceProvider.device.queue.writeBuffer(outputBuffer, 0, this._clearArrays[index]));
    }
};

