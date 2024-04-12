import { TextureWrapper } from '../../services/texture-wrapper';
import { IServiceProvider } from '../../services/service-provider';
import { RenderNodeBase } from './render-node-base';

export abstract class ExportableRenderNodeBase<T extends Float32Array | Uint8Array> extends RenderNodeBase {

    protected readonly _stagingBuffer: GPUBuffer;

    public constructor(
        name: string,
        serviceProvider: IServiceProvider,
        texture: TextureWrapper
    ) {
        super(name, serviceProvider, texture);

        // buffers
        this._stagingBuffer = this.createStagingBuffer(texture.byteLength);
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