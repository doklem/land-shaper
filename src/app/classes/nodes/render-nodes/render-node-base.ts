import { IDisposable } from '../../disposable';
import { BufferManager } from '../../gpu-resources/buffer-manager';
import { ShaderUtils } from '../../gpu-resources/shader-utils';
import { TextureWrapper } from '../../gpu-resources/texture-wrapper';
import { ITextureSettings } from '../../settings/texture-settings';

export abstract class RenderNodeBase implements IDisposable {

    protected abstract readonly _pipeline: GPURenderPipeline;

    public get textureSettings(): ITextureSettings {
        return this._texture.settings;
    }

    public constructor(
        protected readonly _name: string,
        protected readonly _device: GPUDevice,
        protected readonly _buffers: BufferManager,
        protected readonly _texture: TextureWrapper) {

    }

    public abstract appendRenderPass(commandEncoder: GPUCommandEncoder): void;

    public dispose(): void { }

    protected createPipeline(
        bindGroupLayout: GPUBindGroupLayout,
        fragmentShader: string,
        entryPointFragment?: string): GPURenderPipeline {
        return this._device.createRenderPipeline({
            label: `${this._name} Render Pipeline`,
            layout: this._device.createPipelineLayout({
                label: `${this._name} Pipeline Layout`,
                bindGroupLayouts: [bindGroupLayout],
            }),
            vertex: this._buffers.clipSpaceQuadVertexState,
            fragment: {
                module: this._device.createShaderModule({
                    label: `${this._name} Fragment Shader Module`,
                    code: ShaderUtils.applyIncludes(fragmentShader)
                }),
                entryPoint: entryPointFragment ?? 'main',
                targets: [{ format: this._texture.texture.format }]
            }
        });
    }
}