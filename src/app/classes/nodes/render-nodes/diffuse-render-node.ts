import FragmentShader from './../../../shaders/diffuse-fragment.wgsl';
import { BufferManager } from '../../gpu-resources/buffer-manager';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { ExportableRenderNodeBase } from './exportable-render-node-base';
import { MixedColorSettings } from '../../settings/mixed-color-settings';
import { TextureWrapper } from '../../gpu-resources/texture-wrapper';
import { Vector2 } from 'three';
import { SettingsManager } from '../../settings/settings-manager';

export class DiffuseRenderNode extends ExportableRenderNodeBase {

    public static readonly NAME = 'Diffuse';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    public constructor(
        private readonly _settings: SettingsManager,
        device: GPUDevice,
        buffers: BufferManager,
        textures: TextureManager,
        private readonly _uvRange: Vector2,
        surfaceTexture: TextureWrapper,
        displacementTexture: TextureWrapper,
        outputTexture: TextureWrapper
    ) {
        super(
            DiffuseRenderNode.NAME,
            device,
            buffers,
            outputTexture);

        // buffers
        this._uniformConfigArray = new ArrayBuffer(
            Float32Array.BYTES_PER_ELEMENT * 4
            + MixedColorSettings.BYTE_LENGTH * 3);
        this._uniformConfigBuffer = device.createBuffer({
            label: `${this._name} Uniform Config Buffer`,
            size: this._uniformConfigArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });

        // bind group layout
        const bindGroupLayout = device.createBindGroupLayout({
            label: `${this._name} Bind Group Layout`,
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: surfaceTexture.bindingLayout,
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: displacementTexture.bindingLayout,
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: surfaceTexture.settings.samplerBinding },
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                /*{
                    binding: 4,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: textures.debug.bindingLayout,
                },*/
            ]
        });

        // bind group
        this._bindGroup = this._device.createBindGroup({
            label: `${this._name} Bind Group`,
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: surfaceTexture.view,
                },
                {
                    binding: 1,
                    resource: displacementTexture.view,
                },
                {
                    binding: 2,
                    resource: textures.floatSampler,
                },
                {
                    binding: 3,
                    resource: { buffer: this._uniformConfigBuffer },
                },
                /*{
                    binding: 4,
                    resource: textures.debug.view,
                },*/
            ]
        });

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render bundle
        this._renderBundle = this.createRenderBundle(this._pipeline, this._bindGroup);
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
        offset = this._settings.diffuse.vegetation.serialize(uniformConfigView, offset, this._settings.constants.littleEndian);
        offset = this._settings.diffuse.bedrock.serialize(uniformConfigView, offset, this._settings.constants.littleEndian);
        offset = this._settings.diffuse.gravel.serialize(uniformConfigView, offset, this._settings.constants.littleEndian);
        this._device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public override dispose(): void {
        super.dispose();
        this._uniformConfigBuffer.destroy();
    }
}