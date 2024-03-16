export interface IExportableNode {
    readOutputBuffer(output: Float32Array): Promise<void>;
}