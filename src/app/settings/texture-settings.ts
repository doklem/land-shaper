export interface ITextureSettings {
    readonly byteLength: number;
    readonly bytesPerRow: number;
    readonly format: GPUTextureFormat;
    readonly height: number;
    readonly samplerBinding: GPUSamplerBindingType;
    readonly size: number;
    readonly valuesLength: number;
    readonly width: number;
}