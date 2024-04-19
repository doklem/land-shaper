import FragmentShader from '../../../shaders/fragment/add.wgsl';
import { TextureWrapper } from '../../services/texture-wrapper';
import { IServiceProvider } from '../../services/service-provider';
import { ExportableFloatRenderNodeBase } from './exportable-float-render-node-base';
import { IDisplacementNode } from '../displacement-node';

export class AddRenderNode extends ExportableFloatRenderNodeBase implements IDisplacementNode {

    private static readonly NAME = 'Add';

    private readonly _bindGroup: GPUBindGroup;

    protected override readonly _renderBundle: GPURenderBundle;
    protected override readonly _pipeline: GPURenderPipeline;

    constructor(
        serviceProvider: IServiceProvider,
        inputTextureA: TextureWrapper,
        inputTextureB: TextureWrapper,
        outputTexture: TextureWrapper) {
        super(AddRenderNode.NAME, serviceProvider, outputTexture);

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout([
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                texture: inputTextureA.bindingLayout,
            },
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: inputTextureB.bindingLayout,
            },
            {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: inputTextureA.settings.samplerBinding },
            },
        ]);

        // bind group
        this._bindGroup = this.createBindGroup(
            bindGroupLayout,
            [
                {
                    binding: 0,
                    resource: inputTextureA.view,
                },
                {
                    binding: 1,
                    resource: inputTextureB.view,
                },
                {
                    binding: 2,
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