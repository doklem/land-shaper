import FragmentShader from './../../../shaders/displacement-fragment.wgsl';
import { BufferManager } from '../../gpu-resources/buffer-manager';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { ExportableRenderNodeBase } from './exportable-render-node-base';
import { SettingsManager } from '../../settings/settings-manager';

export class DisplacementRenderNode extends ExportableRenderNodeBase {

    private static readonly NAME = 'Displacement';
    
    public static readonly NAME_DRAFT = `Draft ${DisplacementRenderNode.NAME}`;
    public static readonly NAME_FINAL = `Final ${DisplacementRenderNode.NAME}`;

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigBuffer: GPUBuffer;
    private readonly _uniformConfigArray: ArrayBuffer;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    public constructor(
        private readonly _settings: SettingsManager,
        device: GPUDevice,
        buffers: BufferManager,
        textures: TextureManager,
        isDraft: boolean
    ) {
        super(
            isDraft ? DisplacementRenderNode.NAME_DRAFT : DisplacementRenderNode.NAME_FINAL,
            device,
            buffers,
            isDraft ? textures.displacementDraft : textures.displacementFinal);

        // buffers        
        this._uniformConfigArray = new ArrayBuffer(
            12 * Float32Array.BYTES_PER_ELEMENT
            + Int32Array.BYTES_PER_ELEMENT
            + 3 * Float32Array.BYTES_PER_ELEMENT // Padding
        );
        this._uniformConfigBuffer = device.createBuffer({
            label: `${this._name} Uniform Config Buffer`,
            size: this._uniformConfigArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });

        // bind group layout
        const bindGroupLayout = device.createBindGroupLayout({
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
        this._bindGroup = this._device.createBindGroup({
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
        const uniformConfigView = new DataView(this._uniformConfigArray);
        let offset = 0;
        uniformConfigView.setFloat32(offset, this._settings.topology.offset.x, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.topology.offset.y, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.topology.offset.z, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.topology.seed, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.topology.scale.x, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.topology.scale.y, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.topology.scale.z, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setInt32(offset, this._settings.topology.octaveCount, this._settings.constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.topology.turbulence.x, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.topology.turbulence.y, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.constants.meshSize.x, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.constants.meshSize.y, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._settings.topology.ridgeThreshold, this._settings.constants.littleEndian);
        this._device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public override dispose(): void {
        super.dispose();
        this._uniformConfigBuffer.destroy();
        this._stagingBuffer.destroy();
    }
}