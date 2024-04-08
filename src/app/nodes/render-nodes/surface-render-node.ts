import FragmentShader from '../../../shaders/fragment/surface.wgsl';
import { RenderNodeBase } from './render-node-base';
import { TextureWrapper } from '../../services/texture-wrapper';
import { Vector2 } from 'three';
import { IServiceProvider } from '../../services/service-provider';

export class SurfaceRenderNode extends RenderNodeBase {

    public static readonly NAME = 'Surface';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigArray: Float32Array;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    public constructor(
        serviceProvider: IServiceProvider,
        private readonly _uvRange: Vector2,
        normalObjectSpaceTexture: TextureWrapper,
        displacementTexture: TextureWrapper,
        waterTexture: TextureWrapper,
        outputTexture: TextureWrapper
    ) {
        super(SurfaceRenderNode.NAME, serviceProvider, outputTexture);

        // buffers
        this._uniformConfigArray = new Float32Array(12);
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
                    binding: 3, // sampler
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
        this._bindGroup = serviceProvider.device.createBindGroup({
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
                    resource: serviceProvider.textures.samplerLinearClamping,
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
        const diffuse = this._serviceProvider.settings.diffuse;
        this._uniformConfigArray.set(
            [
                uvOffset?.x ?? 0,
                uvOffset?.y ?? 0,
                this._uvRange.x,
                this._uvRange.y,
                diffuse.slopStart,
                diffuse.slopRange,
                diffuse.riverStart,
                diffuse.riverRange,
                diffuse.shoreStart,
                diffuse.shoreRange
            ]
        );
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public override dispose(): void {
        super.dispose();
        this._uniformConfigBuffer.destroy();
    }
}