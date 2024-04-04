import { BufferService } from '../../services/buffer-service';
import { ExportableRenderNodeBase } from './exportable-render-node-base';

export abstract class ExportableByteRenderNodeBase extends ExportableRenderNodeBase<Uint8Array> {
    public async readOutputBuffer(output: Uint8Array): Promise<void> {
        output.set(new Uint8Array(await BufferService.readGPUBuffer(this._stagingBuffer)));
    }
}