import NoiseInclude from '../../shaders/include/noise.wgsl';
import MixedColorInclude from '../../shaders/include/mixed-color.wgsl';
import UvSectionInclude from '../../shaders/include/uv-section.wgsl';
import { IDisposable } from '../disposable';
import { IServiceProvider } from '../services/service-provider';

export abstract class NodeBase implements IDisposable {

    private readonly _buffers: GPUBuffer[];

    constructor(
        protected readonly _name: string,
        protected readonly _serviceProvider: IServiceProvider) {
        this._buffers = [];
    }

    public dispose(): void {
        this._buffers.forEach(buffer => buffer.destroy());
    }

    protected static applyIncludes(shader: string): string {
        return shader
            .replace('<include noise>', NoiseInclude)
            .replace('<include mixedColor>', MixedColorInclude)
            .replace('<include uvSection>', UvSectionInclude);
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

    protected createBuffer(bufferName: string, byteLength: number, usage: GPUBufferUsageFlags): GPUBuffer {
        const buffer = this._serviceProvider.device.createBuffer({
            label: `${bufferName} ${this._name} Buffer`,
            size: byteLength,
            usage,
        });
        this._buffers.push(buffer);
        return buffer;
    }

    protected createExportableBuffer(bufferName: string, byteLength: number): { buffer: GPUBuffer, staging: GPUBuffer } {
        return {
            buffer: this.createBuffer(bufferName, byteLength, GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE),
            staging: this.createStagingBuffer(byteLength, bufferName)
        };
    }

    protected createStagingBuffer(byteLength: number, namePrefix?: string): GPUBuffer {
        return this.createBuffer(namePrefix !== undefined ? `${namePrefix} Staging` : 'Staging',
            byteLength,
            GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
    }

    protected createUniformBuffer(byteLength: number): GPUBuffer {
        return this.createBuffer('Uniform', byteLength, GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM);
    }
}