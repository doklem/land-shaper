import FragmentShader from '../../../shaders/fragment/bumps.wgsl';
import { RenderNodeBase } from './render-node-base';
import { Vector2 } from 'three';
import { TextureWrapper } from '../../services/texture-wrapper';
import { IServiceProvider } from '../../services/service-provider';

export class BumpsRenderNode extends RenderNodeBase {

    public static readonly NAME = 'Bumps';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;

    protected override readonly _renderBundle: GPURenderBundle;
    protected override readonly _pipeline: GPURenderPipeline;

    public constructor(
        serviceProvider: IServiceProvider,
        private readonly _uvRange: Vector2,
        outputTexture: TextureWrapper
    ) {
        super(BumpsRenderNode.NAME, serviceProvider, outputTexture);

        // uniform buffers
        this._uniformConfigArray = new ArrayBuffer(
            8 * Float32Array.BYTES_PER_ELEMENT
            + Int32Array.BYTES_PER_ELEMENT
            + 3 * Float32Array.BYTES_PER_ELEMENT); // Padding
        this._uniformConfigBuffer = this.createUniformBuffer(this._uniformConfigArray.byteLength);

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

    public configureRun(uvOffset?: Vector2): void {
        const constants = this._serviceProvider.settings.constants;
        const normals = this._serviceProvider.settings.bumps;
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

        uniformConfigView.setFloat32(offset, normals.scale.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, normals.scale.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, normals.seed, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, normals.amplitude, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;

        uniformConfigView.setInt32(offset, normals.octaves, constants.littleEndian);
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }
}