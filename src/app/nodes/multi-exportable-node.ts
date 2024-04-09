export interface IMultiExportableNode<T extends RelativeIndexable<number>> {
    readOutputBuffer(outputs: T[]): Promise<void>;
}