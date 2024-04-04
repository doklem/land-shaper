export interface ITextureSettings {
    readonly width: number;
    readonly height: number;
    readonly size: number;
    readonly byteLength: number;
    readonly bytesPerRow: number;
    readonly samplerBinding: GPUSamplerBindingType;
    readonly valuesLength: number;
    readonly format: GPUTextureFormat;
}