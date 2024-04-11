import { IDisposable } from '../../disposable';
import { ShaderUtils } from '../shader-utils';
import { IServiceProvider } from '../../services/service-provider';
import { Vector3 } from 'three';

export abstract class ComputeNodeBase implements IDisposable {

    private readonly _buffers: GPUBuffer[];

    protected readonly abstract _bindGroup: GPUBindGroup;
    protected readonly abstract _pipeline: GPUComputePipeline;

    constructor(
        protected readonly _name: string,
        protected readonly _serviceProvider: IServiceProvider,
        protected readonly _workgroupCount: Vector3) {
        this._buffers = [];
    }

    public appendComputePass(commandEncoder: GPUCommandEncoder): void {
        const computePassEncoder = commandEncoder.beginComputePass();
        computePassEncoder.setPipeline(this._pipeline);
        computePassEncoder.setBindGroup(0, this._bindGroup);
        computePassEncoder.dispatchWorkgroups(this._workgroupCount.x, this._workgroupCount.y, this._workgroupCount.z);
        computePassEncoder.end();
    }

    public dispose(): void {
        this._buffers.forEach(buffer => buffer.destroy());
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
            staging: this.createBuffer(`${bufferName} Staging`, byteLength, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST)
        };
    }

    protected createUniformBuffer(byteLength: number): GPUBuffer {
        return this.createBuffer('Uniform', byteLength, GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM);
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