import ComputeShader from './../../../shaders/rubble-compute.wgsl';
import { Vector2 } from 'three';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { IDisposable } from '../../disposable';
import { ExportableComputeNodeBase } from './exportable-compute-node-base';
import { Rubble } from '../../objects-3d/rubble';
import { MixedColorSettings } from '../../settings/mixed-color-settings';
import { ITextureSettings } from '../../settings/texture-settings';
import { SettingsManager } from '../../settings/settings-manager';

export class RubbleComputeNode extends ExportableComputeNodeBase implements IDisposable {

    private static readonly WORKGROUP_SIZE = 64;

    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected override readonly _bindGroup: GPUBindGroup;
    protected override readonly _pipeline: GPUComputePipeline;

    constructor(
        private readonly _settings: SettingsManager,
        textures: TextureManager,
        device: GPUDevice,
        private readonly _uvRange: Vector2,
        inputTextureSettings: ITextureSettings) {
        super('Rubble',
            device,
            Math.ceil((inputTextureSettings.width * inputTextureSettings.height) / RubbleComputeNode.WORKGROUP_SIZE),
            inputTextureSettings);

        // uniform buffer
        this._uniformConfigArray = new ArrayBuffer(MixedColorSettings.BYTE_LENGTH
            + 12 * Float32Array.BYTES_PER_ELEMENT
            + Float32Array.BYTES_PER_ELEMENT); // Padding
        this._uniformConfigBuffer = device.createBuffer({
            label: `${this._name} Uniform Buffer`,
            size: this._uniformConfigArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout(
            [
                {
                    binding: 0, // surface texture
                    visibility: GPUShaderStage.COMPUTE,
                    texture: textures.surface.bindingLayout,
                },
                {
                    binding: 1, // displacement texture
                    visibility: GPUShaderStage.COMPUTE,
                    texture: textures.displacementFinal.bindingLayout,
                },
                {
                    binding: 2, // float sampler
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: { type: textures.displacementFinal.settings.samplerBinding },
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
                    resource: textures.displacementFinal.view,
                },
                {
                    binding: 1,
                    resource: textures.surface.view,
                },
                {
                    binding: 2,
                    resource: textures.floatSampler,
                },
                {
                    binding: 3,
                    resource: { buffer: this._uniformConfigBuffer },
                },
                {
                    binding: 4,
                    resource:
                    {
                        buffer: this.outputBuffer,
                        size: Rubble.MATRIX_LENGTH * this.textureSettings.height * this.textureSettings.width * Float32Array.BYTES_PER_ELEMENT
                    },
                },
                {
                    binding: 5,
                    resource:
                    {
                        buffer: this.outputBuffer,
                        offset: Rubble.MATRIX_LENGTH * this.textureSettings.height * this.textureSettings.width * Float32Array.BYTES_PER_ELEMENT,
                        size: Rubble.RGBA_LENGTH * this.textureSettings.height * this.textureSettings.width * Float32Array.BYTES_PER_ELEMENT
                    },
                }
            ]
        );

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, ComputeShader);
    }

    public configureRun(uvOffset?: Vector2): void {        
        const uniformConfigView = new DataView(this._uniformConfigArray);
        let offset = 0;
        uniformConfigView.setFloat32(offset, uvOffset?.x ?? 0, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, uvOffset?.y ?? 0, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._uvRange.x, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._uvRange.y, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;

        uniformConfigView.setFloat32(offset, this.textureSettings.width, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this.textureSettings.height, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.constants.meshSize.x, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT
        uniformConfigView.setFloat32(offset, this._settings.constants.meshSize.y, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;

        uniformConfigView.setFloat32(offset, this._settings.rubble.scaleFactor.x, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.rubble.scaleFactor.y, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.rubble.scaleFactor.z, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        offset += Float32Array.BYTES_PER_ELEMENT; // Padding

        offset = this._settings.rubble.color.serialize(uniformConfigView, offset, this._settings.constants.littleEndian);

        this._device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public dispose(): void {
        super.dispose();
        this._uniformConfigBuffer.destroy();
    }
};

