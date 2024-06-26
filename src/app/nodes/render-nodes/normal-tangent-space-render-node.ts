import FragmentShader from '../../../shaders/fragment/normal-tangent-space.wgsl';
import { TextureWrapper } from '../../services/texture-wrapper';
import { IServiceProvider } from '../../services/service-provider';
import { ExportableFloatRenderNodeBase } from './exportable-float-render-node-base';

export class NormalTangentSpaceRenderNode extends ExportableFloatRenderNodeBase {

    public static readonly NAME = 'Normal Tangent Space';

    private readonly _bindGroup: GPUBindGroup;

    protected override readonly _renderBundle: GPURenderBundle;
    protected override readonly _pipeline: GPURenderPipeline;

    public constructor(
        serviceProvider: IServiceProvider,
        normalObjectSpaceTexture: TextureWrapper,
        outputTexture: TextureWrapper) {
        super(NormalTangentSpaceRenderNode.NAME, serviceProvider, outputTexture);
        
        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout([
            {
                binding: 0, // normal object space texture
                visibility: GPUShaderStage.FRAGMENT,
                texture: normalObjectSpaceTexture.bindingLayout,
            },
            {
                binding: 1, // sampler
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: normalObjectSpaceTexture.settings.samplerBinding },
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
                    resource: serviceProvider.textures.samplerLinearClamping,
                },
            ]
        );

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render bundle
        this._renderBundle = this.createRenderBundle(this._pipeline, this._bindGroup);
    }
}