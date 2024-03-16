export interface ITextureSettings {
    readonly width: number;
    readonly height: number;
    readonly byteLength: number;
    readonly bytesPerRow: number;
    readonly samplerBinding: GPUSamplerBindingType;
    readonly length: number;
    readonly format: GPUTextureFormat;
}