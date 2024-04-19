import FragmentShader from '../../../shaders/fragment/diffuse.wgsl';
import { MixedColorSettings } from '../../settings/mixed-color-settings';
import { TextureWrapper } from '../../services/texture-wrapper';
import { Vector2 } from 'three';
import { IServiceProvider } from '../../services/service-provider';
import { ExportableByteRenderNodeBase } from './exportable-byte-render-node-base';

export class DiffuseRenderNode extends ExportableByteRenderNodeBase {

    public static readonly NAME = 'Diffuse';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected override readonly _renderBundle: GPURenderBundle;
    protected override readonly _pipeline: GPURenderPipeline;

    public constructor(
        serviceProvider: IServiceProvider,
        private readonly _uvRange: Vector2,
        surfaceTexture: TextureWrapper,
        displacementTexture: TextureWrapper,
        outputTexture: TextureWrapper/*,debugTexture: TextureWrapper*/
    ) {
        super(DiffuseRenderNode.NAME, serviceProvider, outputTexture);

        // buffers
        this._uniformConfigArray = new ArrayBuffer(
            Float32Array.BYTES_PER_ELEMENT * 4
            + MixedColorSettings.BYTE_LENGTH * 16);
        this._uniformConfigBuffer = this.createUniformBuffer(this._uniformConfigArray.byteLength);

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout([
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                texture: surfaceTexture.bindingLayout,
            },
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: displacementTexture.bindingLayout,
            },
            {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: surfaceTexture.settings.samplerBinding },
            },
            {
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {}
            },
            /*{
                binding: 4,
                visibility: GPUShaderStage.FRAGMENT,
                texture: debugTexture.bindingLayout,
            },*/
        ]);

        // bind group
        this._bindGroup = this.createBindGroup(
            bindGroupLayout,
            [
                {
                    binding: 0,
                    resource: surfaceTexture.view,
                },
                {
                    binding: 1,
                    resource: displacementTexture.view,
                },
                {
                    binding: 2,
                    resource: serviceProvider.textures.samplerLinearClamping,
                },
                {
                    binding: 3,
                    resource: { buffer: this._uniformConfigBuffer },
                },
                /*{
                    binding: 4,
                    resource: debugTexture.view,
                },*/
            ]
        );

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render bundle
        this._renderBundle = this.createRenderBundle(this._pipeline, this._bindGroup);
    }

    public configureRun(uvOffset?: Vector2): void {
        const constants = this._serviceProvider.settings.constants;
        const diffuse = this._serviceProvider.settings.diffuse;
        const uniformConfigView = new DataView(this._uniformConfigArray);
        let offset = 0;
        uniformConfigView.setFloat32(offset, uvOffset?.x ?? 0, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, uvOffset?.y ?? 0, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._uvRange.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._uvRange.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        offset = diffuse.bedrockFlatNoRiverNoLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.bedrockFlatNoRiverLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.bedrockFlatRiverNoLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.bedrockFlatRiverLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.bedrockSlopeNoRiverNoLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.bedrockSlopeNoRiverLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.bedrockSlopeRiverNoLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.bedrockSlopeRiverLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.sedimentFlatNoRiverNoLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.sedimentFlatNoRiverLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.sedimentFlatRiverNoLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.sedimentFlatRiverLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.sedimentSlopeNoRiverNoLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.sedimentSlopeNoRiverLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.sedimentSlopeRiverNoLake.serialize(uniformConfigView, offset, constants.littleEndian);
        offset = diffuse.sedimentSlopeRiverLake.serialize(uniformConfigView, offset, constants.littleEndian);
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }
}