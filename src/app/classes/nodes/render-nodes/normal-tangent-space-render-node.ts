import FragmentShader from './../../../shaders/normal-tangent-space-fragment.wgsl';
import { ExportableRenderNodeBase } from './exportable-render-node-base';
import { TextureWrapper } from '../../services/texture-wrapper';
import { IServiceProvider } from '../../services/service-provider';

export class NormalTangentSpaceRenderNode extends ExportableRenderNodeBase {

    public static readonly NAME = 'Normal Tangent Space';

    private readonly _bindGroup: GPUBindGroup;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    public constructor(
        serviceProvider: IServiceProvider,
        normalObjectSpaceTexture: TextureWrapper,
        outputTexture: TextureWrapper) {
        super(NormalTangentSpaceRenderNode.NAME, serviceProvider, outputTexture);
        
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
                    binding: 1, // float sampler
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: normalObjectSpaceTexture.settings.samplerBinding },
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
                    resource: serviceProvider.textures.floatSampler,
                },
            ]
        });

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render bundle
        this._renderBundle = this.createRenderBundle(this._pipeline, this._bindGroup);
    }
}