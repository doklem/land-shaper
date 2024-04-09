import { ITextureSettings } from '../../settings/texture-settings';
import { ComputeNodeBase } from './compute-node-base';
import { IServiceProvider } from '../../services/service-provider';
import { BufferService } from '../../services/buffer-service';
import { IMultiExportableNode } from '../multi-exportable-node';
import { Vector3 } from 'three';

export abstract class ExportableComputeNodeBase<T extends Float32Array | Uint8Array | Int32Array> extends ComputeNodeBase implements IMultiExportableNode<T> {

    protected readonly _stagingBuffers: GPUBuffer[];

    constructor(
        name: string,
        serviceProvider: IServiceProvider,
        workgroupCount: Vector3,
        textureSettings: ITextureSettings[],
        outputBuffer?: GPUBuffer[]) {
        super(name, serviceProvider, workgroupCount, textureSettings, outputBuffer);

        // output buffers
        this._stagingBuffers = this.outputBuffers.map((outputBuffer: GPUBuffer, index: number) => serviceProvider.device.createBuffer({
            label: `${this._name} Staging Buffer ${index}`,
            size: outputBuffer.size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        }));
    }

    public override dispose(): void {
        super.dispose();
        this._stagingBuffers.forEach(buffer => buffer.destroy());
    }

    public async readOutputBuffer(outputs: T[]): Promise<void> {
        if (outputs.length !== this._stagingBuffers.length) {
            throw new Error('The number of provided outputs does not match the number of staging buffers');
        }
        await Promise.all(
            outputs.map(async (output: T, index: number) => output.set(this.createOutput(await BufferService.readGPUBuffer(this._stagingBuffers[index]))))
        );
    }

    protected override appendToCommandEncoder(commandEncoder: GPUCommandEncoder): void {
        this.outputBuffers.forEach(
            (outputBuffer: GPUBuffer, index: number) => commandEncoder.copyBufferToBuffer(outputBuffer, 0, this._stagingBuffers[index], 0, outputBuffer.size));
    }

    protected abstract createOutput(data: ArrayBuffer): T;
}