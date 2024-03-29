import { IDisposable } from '../disposable';
import { ITextureSettings } from '../settings/texture-settings';

export class TextureWrapper implements GPUImageCopyTexture, GPUExtent3DDict, GPUImageDataLayout, IDisposable {

    private static readonly DIMENSION: GPUTextureViewDimension = '2d';

    public readonly texture: GPUTexture;
    public readonly view: GPUTextureView;
    public readonly bindingLayout: GPUTextureBindingLayout;

    public get width(): number {
        return this.texture.width;
    }

    public get height(): number {
        return this.texture.height;
    }

    public get bytesPerRow(): number {
        return this.settings.bytesPerRow;
    }

    public get byteLength(): number {
        return this.settings.byteLength;
    }

    constructor(
        device: GPUDevice,
        sampleType: GPUTextureSampleType,
        usage: number,
        name: string,
        public readonly settings: ITextureSettings) {
        this.texture = device.createTexture({
            format: settings.format,
            size: {
                width: settings.width,
                height: settings.height
            },
            usage,
            label: `${name} Texture`
        });
        this.view = this.texture.createView({
            dimension: TextureWrapper.DIMENSION,
            format: settings.format,
            label: `${name} Texture View`
        });
        this.bindingLayout = {
            multisampled: false,
            sampleType,
            viewDimension: TextureWrapper.DIMENSION,
        };
    }

    public dispose(): void {
        this.texture.destroy();
    }
};

