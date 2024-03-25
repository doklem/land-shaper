import { BufferManager } from '../../gpu-resources/buffer-manager';
import { TextureWrapper } from '../../gpu-resources/texture-wrapper';
import { IExportableNode } from '../exportable-node';
import { RenderNodeBase } from './render-node-base';

export abstract class ExportableRenderNodeBase extends RenderNodeBase implements IExportableNode {

    protected readonly _stagingBuffer: GPUBuffer;

    public constructor(
        name: string,
        device: GPUDevice,
        buffers: BufferManager,
        texture: TextureWrapper
    ) {
        super(
            name,
            device,
            buffers,
            texture);

        // buffers
        this._stagingBuffer = device.createBuffer({
            label: `${this._name} Staging Buffer`,
            size: this._texture.byteLength,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
    }

    public override dispose(): void {
        super.dispose();
        this._stagingBuffer.destroy();
    }

    public async readOutputBuffer(output: Float32Array): Promise<void> {
        output.set(new Float32Array(await BufferManager.readGPUBuffer(this._stagingBuffer)));
    }

    public appendRenderPass(commandEncoder: GPUCommandEncoder): void {
        super.appendRenderPass(commandEncoder);
        commandEncoder.copyTextureToBuffer(
            this._texture,
            {
                buffer: this._stagingBuffer,
                bytesPerRow: this._texture.bytesPerRow
            },
            this._texture.settings
        );
    }
}