import { BufferService } from '../../services/buffer-service';
import { ExportableRenderNodeBase } from './exportable-render-node-base';

export abstract class ExportableFloatRenderNodeBase extends ExportableRenderNodeBase<Float32Array> {
    public async readOutputBuffer(output: Float32Array): Promise<void> {
        output.set(new Float32Array(await BufferService.readGPUBuffer(this._stagingBuffer)));
    }
}