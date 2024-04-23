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

    protected override readonly _renderBundle: GPURenderBundle;
    protected override readonly _pipeline: GPURenderPipeline;

    public constructor(
        serviceProvider: IServiceProvider,
        private readonly _uvRange: Vector2,
        normalObjectSpaceTexture: TextureWrapper,
        displacementBedrockTexture: TextureWrapper,
        displacementSedimentTexture: TextureWrapper,
        waterTexture: TextureWrapper,
        outputTexture: TextureWrapper
    ) {
        super(SurfaceRenderNode.NAME, serviceProvider, outputTexture);

        // buffers
        this._uniformConfigArray = new Float32Array(16);
        this._uniformConfigBuffer = this.createUniformBuffer(this._uniformConfigArray.byteLength);

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout([
            {
                binding: 0, // normal object space texture
                visibility: GPUShaderStage.FRAGMENT,
                texture: normalObjectSpaceTexture.bindingLayout,
            },
            {
                binding: 1, // displacement bedrock texture
                visibility: GPUShaderStage.FRAGMENT,
                texture: displacementBedrockTexture.bindingLayout,
            },
            {
                binding: 2, // displacement sediment texture
                visibility: GPUShaderStage.FRAGMENT,
                texture: displacementSedimentTexture.bindingLayout,
            },
            {
                binding: 3, // water texture
                visibility: GPUShaderStage.FRAGMENT,
                texture: waterTexture.bindingLayout,
            },
            {
                binding: 4, // sampler
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: normalObjectSpaceTexture.settings.samplerBinding },
            },
            {
                binding: 5, // config uniform
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {}
            },
        ]);

        // bind group
        this._bindGroup = this.createBindGroup(
            bindGroupLayout,
            [
                {
                    binding: 0,
                    resource: normalObjectSpaceTexture.view,
                },
                {
                    binding: 1,
                    resource: displacementBedrockTexture.view,
                },
                {
                    binding: 2,
                    resource: displacementSedimentTexture.view,
                },
                {
                    binding: 3,
                    resource: waterTexture.view,
                },
                {
                    binding: 4,
                    resource: serviceProvider.textures.samplerLinearClamping,
                },
                {
                    binding: 5,
                    resource: { buffer: this._uniformConfigBuffer },
                },
            ]
        );

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
                diffuse.shoreRange,
                diffuse.sedimentStart,
                diffuse.sedimentRange
            ]
        );
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }
}