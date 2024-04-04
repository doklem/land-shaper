import FragmentShader from './../../../shaders/divide-fragment.wgsl';
import { Vector2 } from 'three';
import { TextureWrapper } from '../../services/texture-wrapper';
import { IServiceProvider } from '../../services/service-provider';
import { ExportableFloatRenderNodeBase } from './exportable-float-render-node-base';

export class ExportableDivideRenderNode extends ExportableFloatRenderNodeBase {

    private static readonly NAME = 'Exportable Divide';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigArray: Float32Array;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    constructor(
        serviceProvider: IServiceProvider,
        private readonly _uvRange: Vector2,
        inputTexture: TextureWrapper,
        outputTexture: TextureWrapper) {
        super(ExportableDivideRenderNode.NAME, serviceProvider, outputTexture);

        // uniform buffers
        this._uniformConfigArray = new Float32Array(4);
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
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: inputTexture.bindingLayout,
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: inputTexture.settings.samplerBinding },
                },
                {
                    binding: 2, // config uniform
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
                    resource: inputTexture.view,
                },
                {
                    binding: 1,
                    resource: serviceProvider.textures.floatSampler,
                },
                {
                    binding: 2,
                    resource: { buffer: this._uniformConfigBuffer },
                },
            ]
        });

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render bundle
        this._renderBundle = this.createRenderBundle(this._pipeline, this._bindGroup);  
    }

    public configureRun(uvOffset: Vector2): void {
        this._uniformConfigArray.set([uvOffset.x, uvOffset.y, this._uvRange.x, this._uvRange.y]);
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }
}