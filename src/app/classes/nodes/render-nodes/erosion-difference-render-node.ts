import { IServiceProvider } from '../../services/service-provider';
import FragmentShader from './../../../shaders/erosion-difference-fragment.wgsl';
import { ExportableRenderNodeBase } from './exportable-render-node-base';

export class ErosionDifferenceRenderNode extends ExportableRenderNodeBase {

    public static readonly NAME = 'Erosion Difference';

    private readonly _bindGroup: GPUBindGroup;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    public constructor(serviceProvider: IServiceProvider) {
        super(ErosionDifferenceRenderNode.NAME, serviceProvider, serviceProvider.textures.displacementErosionDifference);

        // bind group layout
        const bindGroupLayout = serviceProvider.device.createBindGroupLayout({
            label: `${this._name} Bind Group Layout`,
            entries: [
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
            ]
        });

        // bind group
        this._bindGroup = serviceProvider.device.createBindGroup({
            label: `${this._name} Bind Group`,
            layout: bindGroupLayout,
            entries: [
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
                    resource: serviceProvider.textures.floatSampler,
                },
            ]
        });

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