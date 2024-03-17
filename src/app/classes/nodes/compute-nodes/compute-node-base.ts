import { IDisposable } from '../../disposable';
import { ShaderUtils } from '../../gpu-resources/shader-utils';
import { TextureWrapper } from '../../gpu-resources/texture-wrapper';
import { ITextureSettings } from '../../settings/texture-settings';

export abstract class ComputeNodeBase implements IDisposable {

    private readonly _externalOutputBuffer: boolean;

    protected readonly abstract _bindGroup: GPUBindGroup;
    protected readonly abstract _pipeline: GPUComputePipeline;

    public readonly outputBuffer: GPUBuffer;

    constructor(
        protected readonly _name: string,
        protected readonly _device: GPUDevice,
        protected readonly _workgroupCount: number,
        public readonly textureSettings: ITextureSettings,
        outputBuffer?: GPUBuffer) {
        this._externalOutputBuffer = !outputBuffer;

        // output buffers
        this.outputBuffer = outputBuffer ?? _device.createBuffer({
            label: `${this._name} Output Buffer`,
            size: this.textureSettings.byteLength,
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
        });
    }

    public appendComputePass(commandEncoder: GPUCommandEncoder): void {
        const computePassEncoder = commandEncoder.beginComputePass();
        computePassEncoder.setPipeline(this._pipeline);
        computePassEncoder.setBindGroup(0, this._bindGroup);
        computePassEncoder.dispatchWorkgroups(this._workgroupCount);
        computePassEncoder.end();
        this.appendToCommandEncoder(commandEncoder);
    }

    public dispose(): void {
        if (!this._externalOutputBuffer) {
            this.outputBuffer.destroy();
        }
    }

    protected appendToCommandEncoder(commandEncoder: GPUCommandEncoder): void { }

    protected appendCopyOutputToTexture(commandEncoder: GPUCommandEncoder, texture: TextureWrapper): void {
        ComputeNodeBase.appendCopyToTexture(commandEncoder, this.outputBuffer, texture);
    }

    protected static appendCopyToTexture(commandEncoder: GPUCommandEncoder, buffer: GPUBuffer, texture: TextureWrapper): void {
        commandEncoder.copyBufferToTexture(
            {
                buffer: buffer,
                bytesPerRow: texture.bytesPerRow,
            },
            texture,
            texture
        );
    }

    protected createBindGroup(bindGroupLayout: GPUBindGroupLayout, entries: Iterable<GPUBindGroupEntry>): GPUBindGroup {
        return this._device.createBindGroup({
            label: `${this._name} Bind Group`,
            layout: bindGroupLayout,
            entries: entries
        });
    }

    protected createBindGroupLayout(entries: Iterable<GPUBindGroupLayoutEntry>): GPUBindGroupLayout {
        return this._device.createBindGroupLayout({
            label: `${this._name} Bind Group Layout`,
            entries: entries
        });
    }

    protected createPipeline(bindGroupLayout: GPUBindGroupLayout, shader: string, name?: string, entryPoint?: string): GPUComputePipeline {
        return this._device.createComputePipeline({
            label: `${name ?? this._name} Compute Pipeline`,
            layout: this._device.createPipelineLayout({
                label: `${name ?? this._name} Pipeline Layout`,
                bindGroupLayouts: [bindGroupLayout],
            }),
            compute: {
                module: this._device.createShaderModule({
                    label: `${name ?? this._name} Compute Shader Module`,
                    code: ShaderUtils.applyIncludes(shader),
                }),
                entryPoint: entryPoint ?? 'main',
            },
        });
    }
}