import { ExportableComputeNodeBase } from './exportable-compute-node-base';

export abstract class ExportableFloatComputeNodeBase extends ExportableComputeNodeBase<Float32Array> {
    protected override createOutput(data: ArrayBuffer): Float32Array {
        return new Float32Array(data);
    }
}