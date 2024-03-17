import { BufferManager } from '../../gpu-resources/buffer-manager';
import { IExportableNode } from '../exportable-node';
import { ITextureSettings } from '../../settings/texture-settings';
import { ComputeNodeBase } from './compute-node-base';

export abstract class ExportableComputeNodeBase extends ComputeNodeBase implements IExportableNode {

    protected readonly _stagingBuffer: GPUBuffer;

    constructor(
        name: string,
        device: GPUDevice,
        workgroupCount: number,
        textureSettings: ITextureSettings) {
        super(name, device, workgroupCount, textureSettings);

        // output buffers
        this._stagingBuffer = device.createBuffer({
            label: `${this._name} Staging Buffer`,
            size: this.outputBuffer.size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
    }

    public async readOutputBuffer(output: Float32Array): Promise<void> {
        output.set(new Float32Array(await BufferManager.readGPUBuffer(this._stagingBuffer)));
    }

    public override dispose(): void {
        super.dispose();
        this._stagingBuffer.destroy();
    }

    protected override appendToCommandEncoder(commandEncoder: GPUCommandEncoder): void {
        commandEncoder.copyBufferToBuffer(this.outputBuffer, 0, this._stagingBuffer, 0, this.outputBuffer.size);
    }
}