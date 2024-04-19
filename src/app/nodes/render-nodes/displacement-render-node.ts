import FragmentShader from '../../../shaders/fragment/displacement.wgsl';
import { IServiceProvider } from '../../services/service-provider';
import { MathUtils } from 'three';
import { ExportableFloatRenderNodeBase } from './exportable-float-render-node-base';
import { IDisplacementNode } from '../displacement-node';

export class DisplacementRenderNode extends ExportableFloatRenderNodeBase implements IDisplacementNode {

    private static readonly NAME = 'Displacement';

    public static readonly NAME_EROSION = `Erosion ${DisplacementRenderNode.NAME}`;
    public static readonly NAME_EROSION_UNTOUCHED = `Erosion Untouched ${DisplacementRenderNode.NAME}`;
    public static readonly NAME_TOPOLOGY = `Topology ${DisplacementRenderNode.NAME}`;
    public static readonly NAME_EROSION_BEDROCK = `Erosion Bedrock ${DisplacementRenderNode.NAME}`;
    public static readonly NAME_EROSION_SEDIMENT = `Erosion Sediment ${DisplacementRenderNode.NAME}`;

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigBuffer: GPUBuffer;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _sedimentBuffer?: GPUBuffer;

    protected override readonly _renderBundle: GPURenderBundle;
    protected override readonly _pipeline: GPURenderPipeline;

    public constructor(
        serviceProvider: IServiceProvider,
        private readonly _isTopology: boolean) {
        super(
            _isTopology ? DisplacementRenderNode.NAME_TOPOLOGY : DisplacementRenderNode.NAME_EROSION_UNTOUCHED,
            serviceProvider,
            _isTopology ? serviceProvider.textures.displacementTopology : serviceProvider.textures.displacementErosionUntouched);

        // buffers        
        this._uniformConfigArray = new ArrayBuffer(
            18 * Float32Array.BYTES_PER_ELEMENT
            + Int32Array.BYTES_PER_ELEMENT
            + Float32Array.BYTES_PER_ELEMENT // Padding
        );
        this._uniformConfigBuffer = this.createUniformBuffer(this._uniformConfigArray.byteLength);

        if (!_isTopology) {
            this._sedimentBuffer = this.createBuffer('Sediment', serviceProvider.textures.displacementErosionSediment.byteLength, GPUBufferUsage.COPY_SRC);
        }

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout([
            {
                binding: 0, // config uniform
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {}
            },
        ]);

        // bind group
        this._bindGroup = this.createBindGroup(
            bindGroupLayout,
            [
                {
                    binding: 0,
                    resource: { buffer: this._uniformConfigBuffer },
                },
            ]
        );

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
        uniformConfigView.setInt32(offset, topology.octaves, constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;

        uniformConfigView.setFloat32(offset, topology.turbulence.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.turbulence.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, constants.meshSize.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, constants.meshSize.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;

        const angle = MathUtils.degToRad(topology.rotationAngle);
        const angleCos = Math.cos(angle);
        const angleSin = Math.sin(angle);
        uniformConfigView.setFloat32(offset, angleCos, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, angleSin, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, -angleSin, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, angleCos, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;

        uniformConfigView.setFloat32(offset, topology.rotationOffset.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.rotationOffset.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, topology.ridgeThreshold, constants.littleEndian);
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public override appendRenderPass(commandEncoder: GPUCommandEncoder): void {
        super.appendRenderPass(commandEncoder);
        if (!this._isTopology) {
            commandEncoder.copyTextureToTexture(
                this._texture,
                this._serviceProvider.textures.displacementErosion,
                this._texture);
            commandEncoder.copyTextureToTexture(
                this._texture,
                this._serviceProvider.textures.displacementErosionBedrock,
                this._texture);
            commandEncoder.copyBufferToTexture(
                {
                    buffer: this._sedimentBuffer!,
                    bytesPerRow: this._serviceProvider.textures.displacementErosionSediment.bytesPerRow,
                },
                this._serviceProvider.textures.displacementErosionSediment,
                this._texture);
        }
    }
}