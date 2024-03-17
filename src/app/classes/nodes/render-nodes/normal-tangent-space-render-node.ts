import FragmentShader from './../../../shaders/normal-tangent-space-fragment.wgsl';
import { BufferManager } from '../../gpu-resources/buffer-manager';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { ExportableRenderNodeBase } from './exportable-render-node-base';
import { TextureWrapper } from '../../gpu-resources/texture-wrapper';

export class NormalTangentSpaceRenderNode extends ExportableRenderNodeBase {

    public static readonly NAME = 'Normal Tangent Space';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _renderPassDescriptor: GPURenderPassDescriptor;
    private readonly _renderBundle: GPURenderBundle;

    protected readonly _pipeline: GPURenderPipeline;

    public constructor(
        device: GPUDevice,
        buffers: BufferManager,
        textures: TextureManager,
        normalObjectSpaceTexture: TextureWrapper,
        outputTexture: TextureWrapper) {
        super(
            NormalTangentSpaceRenderNode.NAME,
            device,
            buffers,
            outputTexture);
        
        // bind group layout
        const bindGroupLayout = device.createBindGroupLayout({
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
        this._bindGroup = this._device.createBindGroup({
            label: `${this._name} Bind Group`,
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: normalObjectSpaceTexture.view,
                },
                {
                    binding: 1,
                    resource: textures.floatSampler,
                },
            ]
        });

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render pass descriptor
        this._renderPassDescriptor = {
            label: `${this._name} Render Pass`,
            colorAttachments: [
                {
                    loadOp: 'clear',
                    storeOp: 'store',
                    view: this._texture.view
                }
            ]
        };

        // render bundle
        const renderPassEncoder = this._device.createRenderBundleEncoder({
            label: `${this._name} Render Bundle Encoder`,
            colorFormats: [this._texture.texture.format]
        });
        renderPassEncoder.setPipeline(this._pipeline);
        renderPassEncoder.setBindGroup(0, this._bindGroup);
        buffers.drawClipSpaceQuad(renderPassEncoder);
        this._renderBundle = renderPassEncoder.finish();
    }

    public appendRenderPass(commandEncoder: GPUCommandEncoder): void {
        const renderPassEncoder = commandEncoder.beginRenderPass(this._renderPassDescriptor);
        renderPassEncoder.executeBundles([this._renderBundle]);
        renderPassEncoder.end();
        this.appendTextureExport(commandEncoder);
    }
}