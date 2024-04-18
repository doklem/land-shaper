import { IDisposable } from '../../disposable';
import { IServiceProvider } from '../../services/service-provider';
import { Vector3 } from 'three';
import { NodeBase } from '../node-base';

export abstract class ComputeNodeBase extends NodeBase implements IDisposable {

    protected readonly abstract _pipeline: GPUComputePipeline;

    constructor(
        name: string,
        serviceProvider: IServiceProvider,
        protected readonly _workgroupCount: Vector3) {
        super(name, serviceProvider)
    }

    public abstract appendComputePass(commandEncoder: GPUCommandEncoder): void;

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
                    code: ComputeNodeBase.applyIncludes(shader),
                }),
                entryPoint: entryPoint ?? 'main',
            },
        });
    }

    protected appendDefaultComputePass(commandEncoder: GPUCommandEncoder, bindGroup: GPUBindGroup): void {
        const computePassEncoder = commandEncoder.beginComputePass();
        computePassEncoder.setPipeline(this._pipeline);
        computePassEncoder.setBindGroup(0, bindGroup);
        computePassEncoder.dispatchWorkgroups(this._workgroupCount.x, this._workgroupCount.y, this._workgroupCount.z);
        computePassEncoder.end();
    }
}