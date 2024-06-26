import { TextureWrapper } from '../../services/texture-wrapper';
import { IServiceProvider } from '../../services/service-provider';
import { ITextureSettings } from '../../settings/texture-settings';
import { NodeBase } from '../node-base';

export abstract class RenderNodeBase extends NodeBase {

    protected abstract readonly _pipeline: GPURenderPipeline;
    protected abstract readonly _renderBundle: GPURenderBundle;
    protected readonly _renderPassDescriptor: GPURenderPassDescriptor;

    public get textureSettings(): ITextureSettings {
        return this._texture.settings;
    }

    public constructor(
        name: string,
        serviceProvider: IServiceProvider,
        protected readonly _texture: TextureWrapper) {
        super(name, serviceProvider)
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
    }

    public appendRenderPass(commandEncoder: GPUCommandEncoder): void {
        const renderPassEncoder = commandEncoder.beginRenderPass(this._renderPassDescriptor);
        renderPassEncoder.executeBundles([this._renderBundle]);
        renderPassEncoder.end();
    }

    protected createPipeline(
        bindGroupLayout: GPUBindGroupLayout,
        fragmentShader: string,
        entryPointFragment?: string): GPURenderPipeline {
        return this._serviceProvider.device.createRenderPipeline({
            label: `${this._name} Render Pipeline`,
            layout: this._serviceProvider.device.createPipelineLayout({
                label: `${this._name} Pipeline Layout`,
                bindGroupLayouts: [bindGroupLayout],
            }),
            vertex: this._serviceProvider.buffers.clipSpaceQuadVertexState,
            fragment: {
                module: this._serviceProvider.device.createShaderModule({
                    label: `${this._name} Fragment Shader Module`,
                    code: RenderNodeBase.applyIncludes(fragmentShader)
                }),
                entryPoint: entryPointFragment ?? 'main',
                targets: [{ format: this._texture.texture.format }]
            }
        });
    }

    protected createRenderBundle(pipeline: GPURenderPipeline, bindGroup: GPUBindGroup): GPURenderBundle {
        const renderPassEncoder = this._serviceProvider.device.createRenderBundleEncoder({
            label: `${this._name} Render Bundle Encoder`,
            colorFormats: [this._texture.texture.format]
        });
        renderPassEncoder.setPipeline(pipeline);
        renderPassEncoder.setBindGroup(0, bindGroup);
        this._serviceProvider.buffers.drawClipSpaceQuad(renderPassEncoder);
        return renderPassEncoder.finish();
    }
}