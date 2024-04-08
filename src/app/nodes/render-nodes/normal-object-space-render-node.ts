import FragmentShader from '../../../shaders/fragment/normal-object-space.wgsl';
import { RenderNodeBase } from './render-node-base';
import { Vector2 } from 'three';
import { TextureWrapper } from '../../services/texture-wrapper';
import { IServiceProvider } from '../../services/service-provider';

export class NormalObjectSpaceRenderNode extends RenderNodeBase {

    public static readonly NAME = 'Normal Object Space';

    private readonly _bindGroup: GPUBindGroup;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _uniformConfigBuffer: GPUBuffer;
    private readonly _sampleDistanceUv: Vector2;
    private readonly _sampleDistanceMeters: Vector2;

    protected readonly _renderBundle: GPURenderBundle;
    protected readonly _pipeline: GPURenderPipeline;

    public constructor(
        serviceProvider: IServiceProvider,
        private readonly _uvRange: Vector2,
        displacementTexture: TextureWrapper,
        outputTexture: TextureWrapper
    ) {
        super(NormalObjectSpaceRenderNode.NAME, serviceProvider, outputTexture);

        const terrainResolution = new Vector2(1, 1).divide(_uvRange).multiply(new Vector2(this.textureSettings.width, this.textureSettings.height));
        this._sampleDistanceUv = new Vector2(1, 1).divide(terrainResolution);
        this._sampleDistanceMeters = serviceProvider.settings.constants.meshSize.clone().divide(terrainResolution);

        // uniform buffers
        this._uniformConfigArray = new ArrayBuffer(
            12 * Float32Array.BYTES_PER_ELEMENT
            + Int32Array.BYTES_PER_ELEMENT
            + 3 * Float32Array.BYTES_PER_ELEMENT); // Padding
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
                    binding: 0, // displacement texture
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: displacementTexture.bindingLayout,
                },
                {
                    binding: 1, // sampler
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: displacementTexture.settings.samplerBinding },
                },
                {
                    binding: 2, // config uniform
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
                    resource: displacementTexture.view,
                },
                {
                    binding: 1,
                    resource: serviceProvider.textures.samplerLinearClamping,
                },
                {
                    binding: 2,
                    resource: { buffer: this._uniformConfigBuffer },
                },
            ]
        });

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, FragmentShader);

        // render bundle
        this._renderBundle = this.createRenderBundle(this._pipeline, this._bindGroup);
    }

    public configureRun(uvOffset?: Vector2): void {
        const constants = this._serviceProvider.settings.constants;
        const normals = this._serviceProvider.settings.normals;
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

        uniformConfigView.setFloat32(offset, this._sampleDistanceUv.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._sampleDistanceUv.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._sampleDistanceMeters.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        uniformConfigView.setFloat32(offset, this._sampleDistanceMeters.y, constants.littleEndian);
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