export interface IExportableNode<T extends RelativeIndexable<number>> {
    readOutputBuffer(output: T): Promise<void>;
}