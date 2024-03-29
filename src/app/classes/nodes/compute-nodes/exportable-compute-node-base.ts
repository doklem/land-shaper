import { BufferService } from '../../services/buffer-service';
import { IExportableNode } from '../exportable-node';
import { ITextureSettings } from '../../settings/texture-settings';
import { ComputeNodeBase } from './compute-node-base';
import { IServiceProvider } from '../../services/service-provider';

export abstract class ExportableComputeNodeBase extends ComputeNodeBase implements IExportableNode {

    protected readonly _stagingBuffer: GPUBuffer;

    constructor(
        name: string,
        serviceProvider: IServiceProvider,
        workgroupCount: number,
        textureSettings: ITextureSettings) {
        super(name, serviceProvider, workgroupCount, textureSettings);

        // output buffers
        this._stagingBuffer = serviceProvider.device.createBuffer({
            label: `${this._name} Staging Buffer`,
            size: this.outputBuffer.size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
    }

    public async readOutputBuffer(output: Float32Array): Promise<void> {
        output.set(new Float32Array(await BufferService.readGPUBuffer(this._stagingBuffer)));
    }

    public override dispose(): void {
        super.dispose();
        this._stagingBuffer.destroy();
    }

    protected override appendToCommandEncoder(commandEncoder: GPUCommandEncoder): void {
        commandEncoder.copyBufferToBuffer(this.outputBuffer, 0, this._stagingBuffer, 0, this.outputBuffer.size);
    }
}