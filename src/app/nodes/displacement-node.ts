export interface IDisplacementNode {
    readOutputBuffer(output: Float32Array): Promise<void>;
}