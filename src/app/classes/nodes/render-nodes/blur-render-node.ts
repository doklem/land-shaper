import FragmentShader from './../../../shaders/blur-fragment.wgsl';
import { BufferManager } from '../../gpu-resources/buffer-manager';
import { RenderNodeBase } from './render-node-base';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { SettingsManager } from '../../settings/settings-manager';

export class BlurRenderNode extends RenderNodeBase {

    public static readonly NAME = 'Blur';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _stagingBuffer: GPUBuffer;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    public constructor(
        private readonly _settings: SettingsManager,
        device: GPUDevice,
        buffers: BufferManager,
        private readonly _textures: TextureManager
    ) {
        super(
            BlurRenderNode.NAME,
            device,
            buffers,
            _textures.displacementFinalCopy);

        // buffers
        this._uniformConfigArray = new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2 + Float32Array.BYTES_PER_ELEMENT * 2);
        this._uniformConfigBuffer = device.createBuffer({
            label: `${this._name} Uniform Config Buffer`,
            size: this._uniformConfigArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });

        this._stagingBuffer = device.createBuffer({
            label: `${this._name} Staging Buffer`,
            size: this._texture.byteLength,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });

        // bind group layout
        const bindGroupLayout = device.createBindGroupLayout({
            label: `${this._name} Bind Group Layout`,
            entries: [
                {
                    binding: 0, // displacement texture
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: _textures.displacementFinal.bindingLayout,
                },
                {
                    binding: 1, // float sampler
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: _textures.displacementFinal.settings.samplerBinding },
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
                    resource: _textures.displacementFinal.view,
                },
                {
                    binding: 1,
                    resource: _textures.floatSampler,
                },
                {
                    binding: 2,
                    resource: { buffer: this._uniformConfigBuffer },
                },
            ]
        });

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render bundle
        this._renderBundle = this.createRenderBundle(this._pipeline, this._bindGroup);
    }

    public appendRenderPass(commandEncoder: GPUCommandEncoder): void {
        super.appendRenderPass(commandEncoder);
        commandEncoder.copyTextureToTexture(this._texture, this._textures.displacementFinal, this._texture);
        commandEncoder.copyTextureToBuffer(
            this._texture,
            {
                buffer: this._stagingBuffer,
                bytesPerRow: this._texture.bytesPerRow,
            },
            this._texture.settings);
    }

    public configureRun(): void {
        const uniformConfigView = new DataView(this._uniformConfigArray);
        let offset = 0;
        uniformConfigView.setInt32(offset, this._settings.blur.size.x, this._settings.constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setInt32(offset, this._settings.blur.size.y, this._settings.constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.blur.strength, this._settings.constants.littleEndian);
        this._device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public override dispose(): void {
        this._stagingBuffer.destroy();
        this._uniformConfigBuffer.destroy();
    }

    public async readOutputBuffer(output: Float32Array): Promise<void> {
        output.set(new Float32Array(await BufferManager.readGPUBuffer(this._stagingBuffer)));
    }
}