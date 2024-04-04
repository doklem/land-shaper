import { TextureWrapper } from '../../services/texture-wrapper';
import { IServiceProvider } from '../../services/service-provider';
import { IExportableNode } from '../exportable-node';
import { RenderNodeBase } from './render-node-base';

export abstract class ExportableRenderNodeBase<T extends Float32Array | Uint8Array> extends RenderNodeBase implements IExportableNode<T> {

    protected readonly _stagingBuffer: GPUBuffer;

    public constructor(
        name: string,
        serviceProvider: IServiceProvider,
        texture: TextureWrapper
    ) {
        super(name, serviceProvider, texture);

        // buffers
        this._stagingBuffer = serviceProvider.device.createBuffer({
            label: `${this._name} Staging Buffer`,
            size: this._texture.byteLength,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
    }

    public override dispose(): void {
        super.dispose();
        this._stagingBuffer.destroy();
    }

    public abstract readOutputBuffer(output: T): Promise<void>;

    public override appendRenderPass(commandEncoder: GPUCommandEncoder): void {
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