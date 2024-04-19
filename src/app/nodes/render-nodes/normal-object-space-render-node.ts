import FragmentShader from '../../../shaders/fragment/normal-object-space.wgsl';
import { RenderNodeBase } from './render-node-base';
import { Vector2 } from 'three';
import { TextureWrapper } from '../../services/texture-wrapper';
import { IServiceProvider } from '../../services/service-provider';

export class NormalObjectSpaceRenderNode extends RenderNodeBase {

    public static readonly NAME = 'Normal Object Space';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigArray: Float32Array;
    private readonly _uniformConfigBuffer: GPUBuffer;
    private readonly _sampleDistanceUv: Vector2;
    private readonly _sampleDistanceMeters: Vector2;

    protected override readonly _renderBundle: GPURenderBundle;
    protected override readonly _pipeline: GPURenderPipeline;

    public constructor(
        serviceProvider: IServiceProvider,
        private readonly _uvRange: Vector2,
        displacementTexture: TextureWrapper,
        bumpsTexture: TextureWrapper,
        outputTexture: TextureWrapper
    ) {
        super(NormalObjectSpaceRenderNode.NAME, serviceProvider, outputTexture);

        const terrainResolution = new Vector2(1, 1).divide(_uvRange).multiply(new Vector2(this.textureSettings.width, this.textureSettings.height));
        this._sampleDistanceUv = new Vector2(1, 1).divide(terrainResolution);
        this._sampleDistanceMeters = serviceProvider.settings.constants.meshSize.clone().divide(terrainResolution);

        // uniform buffers
        this._uniformConfigArray = new Float32Array(8 * Float32Array.BYTES_PER_ELEMENT);
        this._uniformConfigBuffer = this.createUniformBuffer(this._uniformConfigArray.byteLength);

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout([
            {
                binding: 0, // displacement texture
                visibility: GPUShaderStage.FRAGMENT,
                texture: displacementTexture.bindingLayout,
            },
            {
                binding: 1, // bumps texture
                visibility: GPUShaderStage.FRAGMENT,
                texture: bumpsTexture.bindingLayout,
            },
            {
                binding: 2, // sampler
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: displacementTexture.settings.samplerBinding },
            },
            {
                binding: 3, // config uniform
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
                    resource: displacementTexture.view,
                },
                {
                    binding: 1,
                    resource: bumpsTexture.view,
                },
                {
                    binding: 2,
                    resource: serviceProvider.textures.samplerLinearClamping,
                },
                {
                    binding: 3,
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
        this._uniformConfigArray.set([
            uvOffset?.x ?? 0,
            uvOffset?.y ?? 0,
            this._uvRange.x,
            this._uvRange.y,
            this._sampleDistanceUv.x,
            this._sampleDistanceUv.y,
            this._sampleDistanceMeters.x,
            this._sampleDistanceMeters.y
        ]);
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }
}