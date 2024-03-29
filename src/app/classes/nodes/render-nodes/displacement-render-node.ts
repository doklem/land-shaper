import FragmentShader from './../../../shaders/displacement-fragment.wgsl';
import { ExportableRenderNodeBase } from './exportable-render-node-base';
import { IServiceProvider } from '../../services/service-provider';

export class DisplacementRenderNode extends ExportableRenderNodeBase {

    private static readonly NAME = 'Displacement';

    public static readonly NAME_DRAFT = `Draft ${DisplacementRenderNode.NAME}`;
    public static readonly NAME_FINAL = `Final ${DisplacementRenderNode.NAME}`;

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigBuffer: GPUBuffer;
    private readonly _uniformConfigArray: ArrayBuffer;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    public constructor(serviceProvider: IServiceProvider, isDraft: boolean) {
        super(
            isDraft ? DisplacementRenderNode.NAME_DRAFT : DisplacementRenderNode.NAME_FINAL,
            serviceProvider,
            isDraft ? serviceProvider.textures.displacementDraft : serviceProvider.textures.displacementFinal);

        // buffers        
        this._uniformConfigArray = new ArrayBuffer(
            12 * Float32Array.BYTES_PER_ELEMENT
            + Int32Array.BYTES_PER_ELEMENT
            + 3 * Float32Array.BYTES_PER_ELEMENT // Padding
        );
        this._uniformConfigBuffer = serviceProvider.device.createBuffer({
            label: `${this._name} Uniform Config Buffer`,
            size: this._uniformConfigArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });

        // bind group layout
        const bindGroupLayout = serviceProvider.device.createBindGroupLayout({
            label: `${this._name} Bind Group Layout`,
            entries: [
                {
                    binding: 0, // config uniform
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
            ]
        });

        // bind group
        this._bindGroup = serviceProvider.device.createBindGroup({
            label: `${this._name} Bind Group`,
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this._uniformConfigBuffer },
                },
            ]
        });

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render bundle
        this._renderBundle = this.createRenderBundle(this._pipeline, this._bindGroup);
    }

    public configureRun(): void {
        const constants = this._serviceProvider.settings.constants;
        const topology = this._serviceProvider.settings.topology;
        const uniformConfigView = new DataView(this._uniformConfigArray);
        let offset = 0;
        uniformConfigView.setFloat32(offset, topology.offset.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.offset.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.offset.z, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.seed, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.scale.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.scale.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.scale.z, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setInt32(offset, topology.octaveCount, constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.turbulence.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.turbulence.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, constants.meshSize.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, constants.meshSize.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.ridgeThreshold, constants.littleEndian);
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public override dispose(): void {
        super.dispose();
        this._uniformConfigBuffer.destroy();
        this._stagingBuffer.destroy();
    }
}