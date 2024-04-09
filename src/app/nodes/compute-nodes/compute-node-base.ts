import { IDisposable } from '../../disposable';
import { ShaderUtils } from '../shader-utils';
import { TextureWrapper } from '../../services/texture-wrapper';
import { IServiceProvider } from '../../services/service-provider';
import { ITextureSettings } from '../../settings/texture-settings';
import { Vector3 } from 'three';

export abstract class ComputeNodeBase implements IDisposable {

    private readonly _externalOutputBuffer: boolean;

    protected readonly abstract _bindGroup: GPUBindGroup;
    protected readonly abstract _pipeline: GPUComputePipeline;

    public readonly outputBuffers: GPUBuffer[];

    constructor(
        protected readonly _name: string,
        protected readonly _serviceProvider: IServiceProvider,
        protected readonly _workgroupCount: Vector3,
        public readonly textureSettings: ITextureSettings[],
        outputBuffers?: GPUBuffer[]) {
        if (outputBuffers && outputBuffers.length !== textureSettings.length) {
            throw new Error('The number of provided output buffers does not match the number of output texture settings');
        }

        this._externalOutputBuffer = !outputBuffers;

        // output buffers
        this.outputBuffers = outputBuffers ?? textureSettings.map((settings: ITextureSettings, index: number) => _serviceProvider.device.createBuffer({
            label: `${_name} Output Buffer ${index}`,
            size: settings.byteLength,
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
        }));
    }

    public appendComputePass(commandEncoder: GPUCommandEncoder): void {
        const computePassEncoder = commandEncoder.beginComputePass();
        computePassEncoder.setPipeline(this._pipeline);
        computePassEncoder.setBindGroup(0, this._bindGroup);
        computePassEncoder.dispatchWorkgroups(this._workgroupCount.x, this._workgroupCount.y, this._workgroupCount.z);
        computePassEncoder.end();
        this.appendToCommandEncoder(commandEncoder);
    }

    public dispose(): void {
        if (!this._externalOutputBuffer) {
            this.outputBuffers.forEach(buffer => buffer.destroy());
        }
    }

    protected appendToCommandEncoder(commandEncoder: GPUCommandEncoder): void { }

    protected appendCopyOutputToTexture(commandEncoder: GPUCommandEncoder, textures: TextureWrapper[]): void {
        this.outputBuffers.forEach((buffer: GPUBuffer, index: number) => ComputeNodeBase.appendCopyToTexture(commandEncoder, buffer, textures[index]));
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
        return this._serviceProvider.device.createBindGroup({
            label: `${this._name} Bind Group`,
            layout: bindGroupLayout,
            entries: entries
        });
    }

    protected createBindGroupLayout(entries: Iterable<GPUBindGroupLayoutEntry>): GPUBindGroupLayout {
        return this._serviceProvider.device.createBindGroupLayout({
            label: `${this._name} Bind Group Layout`,
            entries: entries
        });
    }

    protected createPipeline(bindGroupLayout: GPUBindGroupLayout, shader: string, name?: string, entryPoint?: string): GPUComputePipeline {
        return this._serviceProvider.device.createComputePipeline({
            label: `${name ?? this._name} Compute Pipeline`,
            layout: this._serviceProvider.device.createPipelineLayout({
                label: `${name ?? this._name} Pipeline Layout`,
                bindGroupLayouts: [bindGroupLayout],
            }),
            compute: {
                module: this._serviceProvider.device.createShaderModule({
                    label: `${name ?? this._name} Compute Shader Module`,
                    code: ShaderUtils.applyIncludes(shader),
                }),
                entryPoint: entryPoint ?? 'main',
            },
        });
    }
}