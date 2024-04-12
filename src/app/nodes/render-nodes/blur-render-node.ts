import FragmentShader from '../../../shaders/fragment/blur.wgsl';
import { IServiceProvider } from '../../services/service-provider';
import { IDisplacementNode } from '../displacement-node';
import { ExportableFloatRenderNodeBase } from './exportable-float-render-node-base';

export class BlurRenderNode extends ExportableFloatRenderNodeBase implements IDisplacementNode {

    public static readonly NAME = 'Blur';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    public constructor(serviceProvider: IServiceProvider) {
        super(BlurRenderNode.NAME, serviceProvider, serviceProvider.textures.displacementErosionBlur);

        // buffers
        this._uniformConfigArray = new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2 + Float32Array.BYTES_PER_ELEMENT * 2);
        this._uniformConfigBuffer = this.createUniformBuffer(this._uniformConfigArray.byteLength);

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout([
            {
                binding: 0, // displacement texture
                visibility: GPUShaderStage.FRAGMENT,
                texture: serviceProvider.textures.displacementErosion.bindingLayout,
            },
            {
                binding: 1, // sampler
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: serviceProvider.textures.displacementErosion.settings.samplerBinding },
            },
            {
                binding: 2, // config uniform
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
                    resource: serviceProvider.textures.displacementErosion.view,
                },
                {
                    binding: 1,
                    resource: serviceProvider.textures.samplerLinearClamping,
                },
                {
                    binding: 2,
                    resource: { buffer: this._uniformConfigBuffer },
                },
            ]
        );
        
        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render bundle
        this._renderBundle = this.createRenderBundle(this._pipeline, this._bindGroup);
    }

    public appendRenderPass(commandEncoder: GPUCommandEncoder): void {
        super.appendRenderPass(commandEncoder);
        commandEncoder.copyTextureToTexture(this._texture, this._serviceProvider.textures.displacementErosion, this._texture);
    }

    public configureRun(): void {
        const constants = this._serviceProvider.settings.constants;
        const blur = this._serviceProvider.settings.blur;
        const uniformConfigView = new DataView(this._uniformConfigArray);
        let offset = 0;
        uniformConfigView.setInt32(offset, blur.size.x, constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setInt32(offset, blur.size.y, constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, blur.strength, constants.littleEndian);
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }
}