import FragmentShader from '../../../shaders/fragment/erosion-difference.wgsl';
import { IServiceProvider } from '../../services/service-provider';
import { ExportableByteRenderNodeBase } from './exportable-byte-render-node-base';

export class ErosionDifferenceRenderNode extends ExportableByteRenderNodeBase {

    public static readonly NAME = 'Erosion Difference';

    private readonly _bindGroup: GPUBindGroup;

    protected override readonly _renderBundle: GPURenderBundle;
    protected override readonly _pipeline: GPURenderPipeline;

    public constructor(serviceProvider: IServiceProvider) {
        super(ErosionDifferenceRenderNode.NAME, serviceProvider, serviceProvider.textures.displacementErosionDifference);

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout([
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                texture: serviceProvider.textures.displacementErosionUntouched.bindingLayout,
            },
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: serviceProvider.textures.displacementErosion.bindingLayout,
            },
            {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: serviceProvider.textures.displacementErosion.settings.samplerBinding },
            },
        ]);

        // bind group
        this._bindGroup = this.createBindGroup(
            bindGroupLayout,
            [
                {
                    binding: 0,
                    resource: serviceProvider.textures.displacementErosionUntouched.view,
                },
                {
                    binding: 1,
                    resource: serviceProvider.textures.displacementErosion.view,
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

    /*public appendDebugRenderPass(commandEncoder: GPUCommandEncoder): void {
        commandEncoder.copyTextureToBuffer(
            this._texture,
            {
                buffer: this._stagingBuffer,
                bytesPerRow: this._texture.bytesPerRow
            },
            this._texture.settings
        );
    }*/
}