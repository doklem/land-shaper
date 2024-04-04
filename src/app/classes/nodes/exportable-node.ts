export interface IExportableNode<T extends Float32Array | Uint8Array> {
    readOutputBuffer(output: T): Promise<void>;
}