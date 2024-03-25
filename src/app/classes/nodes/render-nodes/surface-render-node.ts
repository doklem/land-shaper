import FragmentShader from './../../../shaders/surface-fragment.wgsl';
import { BufferManager } from '../../gpu-resources/buffer-manager';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { RenderNodeBase } from './render-node-base';
import { TextureWrapper } from '../../gpu-resources/texture-wrapper';
import { Vector2 } from 'three';
import { SettingsManager } from '../../settings/settings-manager';

export class SurfaceRenderNode extends RenderNodeBase {

    public static readonly NAME = 'Surface';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigArray: Float32Array;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    public constructor(
        private readonly _settings: SettingsManager,
        device: GPUDevice,
        buffers: BufferManager,
        textures: TextureManager,
        private readonly _uvRange: Vector2,
        normalObjectSpaceTexture: TextureWrapper,
        displacementTexture: TextureWrapper,
        waterTexture: TextureWrapper,
        outputTexture: TextureWrapper
    ) {
        super(
            SurfaceRenderNode.NAME,
            device,
            buffers,
            outputTexture);

        // buffers
        this._uniformConfigArray = new Float32Array(12);
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
                    binding: 0, // normal object space texture
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: normalObjectSpaceTexture.bindingLayout,
                },
                {
                    binding: 1, // displacement texture
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: displacementTexture.bindingLayout,
                },
                {
                    binding: 2, // water texture
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: waterTexture.bindingLayout,
                },
                {
                    binding: 3, // float sampler
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: normalObjectSpaceTexture.settings.samplerBinding },
                },
                {
                    binding: 4, // config uniform
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
                    resource: normalObjectSpaceTexture.view,
                },
                {
                    binding: 1,
                    resource: displacementTexture.view,
                },
                {
                    binding: 2,
                    resource: waterTexture.view,
                },
                {
                    binding: 3,
                    resource: textures.floatSampler,
                },
                {
                    binding: 4,
                    resource: { buffer: this._uniformConfigBuffer },
                },
            ]
        });

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render bundle
        this._renderBundle = this.createRenderBundle(this._pipeline, this._bindGroup);
    }

    public configureRun(uvOffset?: Vector2): void {
        this._uniformConfigArray.set(
            [
                uvOffset?.x ?? 0,
                uvOffset?.y ?? 0,
                this._uvRange.x,
                this._uvRange.y,
                this._settings.diffuse.slopStart,
                this._settings.diffuse.slopRange,
                this._settings.diffuse.riverStart,
                this._settings.diffuse.riverRange,
                this._settings.diffuse.shoreStart,
                this._settings.diffuse.shoreRange
            ]
        );
        this._device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public override dispose(): void {
        super.dispose();
        this._uniformConfigBuffer.destroy();
    }
}