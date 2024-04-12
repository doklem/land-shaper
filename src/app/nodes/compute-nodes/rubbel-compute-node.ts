import ComputeShader from '../../../shaders/compute/rubble.wgsl';
import { Vector2, Vector3 } from 'three';
import { MixedColorSettings } from '../../settings/mixed-color-settings';
import { IServiceProvider } from '../../services/service-provider';
import { BufferService } from '../../services/buffer-service';
import { ComputeNodeBase } from './compute-node-base';
import { TextureService } from '../../services/texture-service';

export class RubbleComputeNode extends ComputeNodeBase {

    private static readonly WORKGROUP_SIZE = 64;

    private readonly _colorsOutputBuffer: GPUBuffer;
    private readonly _colorsStagingBuffer: GPUBuffer;
    private readonly _matricesOutputBuffer: GPUBuffer;
    private readonly _matricesStagingBuffer: GPUBuffer;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected override readonly _bindGroup: GPUBindGroup;
    protected override readonly _pipeline: GPUComputePipeline;

    public readonly size: number;

    constructor(
        serviceProvider: IServiceProvider,
        private readonly _uvRange: Vector2,
        private readonly _dimensions: Vector2) {
        super('Rubble',
            serviceProvider,
            new Vector3(Math.ceil((_dimensions.x * _dimensions.y) / RubbleComputeNode.WORKGROUP_SIZE), 1, 1));
        this.size = _dimensions.x * _dimensions.y;

        // buffers
        let buffers = this.createExportableBuffer('Matrices Output', this.size * Float32Array.BYTES_PER_ELEMENT * TextureService.MATRIX_4X4_LENGTH);
        this._matricesOutputBuffer = buffers.buffer;
        this._matricesStagingBuffer = buffers.staging;
        buffers = this.createExportableBuffer('Colors Output', this.size * Float32Array.BYTES_PER_ELEMENT * TextureService.RGBA_PIXEL_LENGTH);
        this._colorsOutputBuffer = buffers.buffer;
        this._colorsStagingBuffer = buffers.staging;
        this._uniformConfigArray = new ArrayBuffer(MixedColorSettings.BYTE_LENGTH
            + 12 * Float32Array.BYTES_PER_ELEMENT
            + Float32Array.BYTES_PER_ELEMENT); // Padding
        this._uniformConfigBuffer = this.createUniformBuffer(this._uniformConfigArray.byteLength);

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout(
            [
                {
                    binding: 0, // surface texture
                    visibility: GPUShaderStage.COMPUTE,
                    texture: serviceProvider.textures.surface.bindingLayout,
                },
                {
                    binding: 1, // displacement texture
                    visibility: GPUShaderStage.COMPUTE,
                    texture: serviceProvider.textures.displacementErosion.bindingLayout,
                },
                {
                    binding: 2, // sampler
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: { type: serviceProvider.textures.displacementErosion.settings.samplerBinding },
                },
                {
                    binding: 3, // uniforms
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {}
                },
                {
                    binding: 4, // matrices output
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                {
                    binding: 5, // colors output
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
                    resource: serviceProvider.textures.displacementErosion.view,
                },
                {
                    binding: 1,
                    resource: serviceProvider.textures.surface.view,
                },
                {
                    binding: 2,
                    resource: serviceProvider.textures.samplerLinearClamping,
                },
                {
                    binding: 3,
                    resource: { buffer: this._uniformConfigBuffer },
                },
                {
                    binding: 4,
                    resource:
                    {
                        buffer: this._matricesOutputBuffer
                    },
                },
                {
                    binding: 5,
                    resource:
                    {
                        buffer: this._colorsOutputBuffer
                    },
                }
            ]
        );

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, ComputeShader);
    }

    public configureRun(uvOffset?: Vector2): void {
        const constants = this._serviceProvider.settings.constants;
        const rubble = this._serviceProvider.settings.rubble;
        const uniformConfigView = new DataView(this._uniformConfigArray);
        let offset = 0;
        uniformConfigView.setFloat32(offset, uvOffset?.x ?? 0, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, uvOffset?.y ?? 0, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._uvRange.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._uvRange.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;

        uniformConfigView.setFloat32(offset, this._dimensions.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._dimensions.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, constants.meshSize.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT
        uniformConfigView.setFloat32(offset, constants.meshSize.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;

        uniformConfigView.setFloat32(offset, rubble.scale.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, rubble.scale.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, rubble.scale.z, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        offset += Float32Array.BYTES_PER_ELEMENT; // Padding

        offset = rubble.color.serialize(uniformConfigView, offset, constants.littleEndian);

        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public override appendComputePass(commandEncoder: GPUCommandEncoder): void {
        super.appendComputePass(commandEncoder);
        commandEncoder.copyBufferToBuffer(this._colorsOutputBuffer, 0, this._colorsStagingBuffer, 0, this._colorsOutputBuffer.size);
        commandEncoder.copyBufferToBuffer(this._matricesOutputBuffer, 0, this._matricesStagingBuffer, 0, this._matricesOutputBuffer.size);
    }

    public async readOutputBuffer(colorsOutput: Float32Array, matricesOutput: Float32Array): Promise<void> {
        await Promise.all([
            colorsOutput.set(new Float32Array(await BufferService.readGPUBuffer(this._colorsStagingBuffer))),
            matricesOutput.set(new Float32Array(await BufferService.readGPUBuffer(this._matricesStagingBuffer)))
        ]);
    }
};
