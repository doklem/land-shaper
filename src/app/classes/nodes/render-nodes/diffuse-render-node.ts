import FragmentShader from './../../../shaders/diffuse-fragment.wgsl';
import { MixedColorSettings } from '../../settings/mixed-color-settings';
import { TextureWrapper } from '../../services/texture-wrapper';
import { Vector2 } from 'three';
import { IServiceProvider } from '../../services/service-provider';
import { ExportableByteRenderNodeBase } from './exportable-byte-render-node-base';

export class DiffuseRenderNode extends ExportableByteRenderNodeBase {

    public static readonly NAME = 'Diffuse';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    public constructor(
        serviceProvider: IServiceProvider,
        private readonly _uvRange: Vector2,
        surfaceTexture: TextureWrapper,
        displacementTexture: TextureWrapper,
        outputTexture: TextureWrapper
    ) {
        super(DiffuseRenderNode.NAME, serviceProvider, outputTexture);

        // buffers
        this._uniformConfigArray = new ArrayBuffer(
            Float32Array.BYTES_PER_ELEMENT * 4
            + MixedColorSettings.BYTE_LENGTH * 3);
        this._uniformConfigBuffer = serviceProvider.device.createBuffer({
            label: `${this._name} Uniform Config Buffer`,
            size: this._uniformConfigArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });

        // bind group layout
        const bindGroupLayout = serviceProvider.device.createBindGroupLayout({
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
        this._bindGroup = serviceProvider.device.createBindGroup({
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
                    resource: serviceProvider.textures.samplerLinearClamping,
                },
                {
                    binding: 3,
                    resource: { buffer: this._uniformConfigBuffer },
                },
                /*{
                    binding: 4,
                    resource: serviceProvider.textures.debug.view,
                },*/
            ]
        });

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render bundle
        this._renderBundle = this.createRenderBundle(this._pipeline, this._bindGroup);
    }

    public configureRun(uvOffset?: Vector2): void {
        const constants = this._serviceProvider.settings.constants;
        const diffuse = this._serviceProvider.settings.diffuse;
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
        offset = diffuse.vegetation.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.bedrock.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.gravel.serialize(uniformConfigView, offset, constants.littleEndian);
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public override dispose(): void {
        super.dispose();
        this._uniformConfigBuffer.destroy();
    }
}