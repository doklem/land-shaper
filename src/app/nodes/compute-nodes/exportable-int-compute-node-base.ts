import { ExportableComputeNodeBase } from './exportable-compute-node-base';

export abstract class ExportableIntComputeNodeBase extends ExportableComputeNodeBase<Int32Array> {
    protected override createOutput(data: ArrayBuffer): Int32Array {
        return new Int32Array(data);
    }
}