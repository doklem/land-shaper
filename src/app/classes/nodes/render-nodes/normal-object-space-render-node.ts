import FragmentShader from './../../../shaders/normal-object-space-fragment.wgsl';
import { BufferManager } from '../../gpu-resources/buffer-manager';
import { RenderNodeBase } from './render-node-base';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { Vector2 } from 'three';
import { TextureWrapper } from '../../gpu-resources/texture-wrapper';
import { SettingsManager } from '../../settings/settings-manager';

export class NormalObjectSpaceRenderNode extends RenderNodeBase {

    public static readonly NAME = 'Normal Object Space';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _renderPassDescriptor: GPURenderPassDescriptor;
    private readonly _renderBundle: GPURenderBundle;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;
    private readonly _sampleDistanceUv: Vector2;
    private readonly _sampleDistanceMeters: Vector2;

    protected readonly _pipeline: GPURenderPipeline;

    public constructor(
        private readonly _settings: SettingsManager,
        device: GPUDevice,
        buffers: BufferManager,
        textures: TextureManager,
        private readonly _uvRange: Vector2,
        displacementTexture: TextureWrapper,
        outputTexture: TextureWrapper
    ) {
        super(
            NormalObjectSpaceRenderNode.NAME,
            device,
            buffers,
            outputTexture);

        const terrainResolution = new Vector2(1, 1).divide(_uvRange).multiply(new Vector2(this.textureSettings.width, this.textureSettings.height));
        this._sampleDistanceUv = new Vector2(1, 1).divide(terrainResolution);
        this._sampleDistanceMeters = _settings.constants.meshSize.clone().divide(terrainResolution);

        // uniform buffers
        this._uniformConfigArray = new ArrayBuffer(
            12 * Float32Array.BYTES_PER_ELEMENT
            + Int32Array.BYTES_PER_ELEMENT
            + 3 * Float32Array.BYTES_PER_ELEMENT); // Padding
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
                    binding: 0, // displacement texture
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: displacementTexture.bindingLayout,
                },
                {
                    binding: 1, // float sampler
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: displacementTexture.settings.samplerBinding },
                },
                {
                    binding: 2, // config uniform
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
            ]
        });

        // bind group
        this._bindGroup = this._device.createBindGroup({
            label: `${this._name} Bind Group`,
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: displacementTexture.view,
                },
                {
                    binding: 1,
                    resource: textures.floatSampler,
                },
                {
                    binding: 2,
                    resource: { buffer: this._uniformConfigBuffer },
                },
            ]
        });

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render pass descriptor
        this._renderPassDescriptor = {
            label: `${this._name} Render Pass`,
            colorAttachments: [
                {
                    loadOp: 'clear',
                    storeOp: 'store',
                    view: this._texture.view
                }
            ]
        };

        // render bundle
        const renderPassEncoder = this._device.createRenderBundleEncoder({
            label: `${this._name} Render Bundle Encoder`,
            colorFormats: [this._texture.texture.format]
        });
        renderPassEncoder.setPipeline(this._pipeline);
        renderPassEncoder.setBindGroup(0, this._bindGroup);
        buffers.drawClipSpaceQuad(renderPassEncoder);
        this._renderBundle = renderPassEncoder.finish();
    }

    public appendRenderPass(commandEncoder: GPUCommandEncoder): void {
        const renderPassEncoder = commandEncoder.beginRenderPass(this._renderPassDescriptor);
        renderPassEncoder.executeBundles([this._renderBundle]);
        renderPassEncoder.end();
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

        uniformConfigView.setFloat32(offset, this._sampleDistanceUv.x, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._sampleDistanceUv.y, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._sampleDistanceMeters.x, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._sampleDistanceMeters.y, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;

        uniformConfigView.setFloat32(offset, this._settings.normals.scale.x, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.normals.scale.y, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.normals.seed, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.normals.amplitude, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;

        uniformConfigView.setInt32(offset, this._settings.normals.octaves, this._settings.constants.littleEndian);
        this._device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }
}