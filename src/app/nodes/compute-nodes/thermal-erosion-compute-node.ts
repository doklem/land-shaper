import ComputeShader from '../../../shaders/compute/thermal-erosion.wgsl';
import { Vector3 } from 'three';
import { IServiceProvider } from '../../services/service-provider';
import { ComputeNodeBase } from './compute-node-base';

export class ThermalErosionComputeNode extends ComputeNodeBase {

    private static readonly NAME = 'Thermal Erosion';
    private static readonly WORKGROUP_SIZE = new Vector3(8, 8, 1);

    private readonly _bindGroups: GPUBindGroup[];
    private readonly _displacementBedrockBuffers: GPUBuffer[];
    private readonly _displacementSedimentBuffers: GPUBuffer[];
    private readonly _uniformConfigBuffer: GPUBuffer;
    private readonly _uniformConfigArray: ArrayBuffer;

    protected override readonly _pipeline: GPUComputePipeline;

    public constructor(_serviceProvider: IServiceProvider) {
        super(
            ThermalErosionComputeNode.NAME,
            _serviceProvider,
            new Vector3(
                _serviceProvider.textures.displacementErosion.width / ThermalErosionComputeNode.WORKGROUP_SIZE.x,
                _serviceProvider.textures.displacementErosion.height / ThermalErosionComputeNode.WORKGROUP_SIZE.y,
                1
            )
        );

        // buffers
        this._uniformConfigArray = new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2
            + Float32Array.BYTES_PER_ELEMENT * 6);
        this._uniformConfigBuffer = this.createUniformBuffer(this._uniformConfigArray.byteLength);

        this._displacementBedrockBuffers = [
            this.createBuffer('Displacement Bedrock A',
                _serviceProvider.textures.displacementErosionBedrock.byteLength,
                GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE),
            this.createBuffer('Displacement Bedrock B',
                _serviceProvider.textures.displacementErosionBedrock.byteLength,
                GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE)
        ];

        this._displacementSedimentBuffers = [
            this.createBuffer('Displacement Sediment A',
                _serviceProvider.textures.displacementErosionSediment.byteLength,
                GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE),
            this.createBuffer('Displacement Sediment B',
                _serviceProvider.textures.displacementErosionSediment.byteLength,
                GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE)
        ];

        // bind group layout
        const bindGroupLayout = _serviceProvider.device.createBindGroupLayout({
            label: `${this._name} Bind Group Layout`,
            entries: [
                {
                    binding: 0, // config uniforms
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1, // displacement bedrock input
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 2, // displacement sediment input
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 3, // displacement bedrock output
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                {
                    binding: 4, // displacement sediment output
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
            ]
        });

        // bind groups
        this._bindGroups = [
            this._serviceProvider.device.createBindGroup({
                label: `${this._name} A Bind Group`,
                layout: bindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: this._uniformConfigBuffer },
                    },
                    {
                        binding: 1,
                        resource: { buffer: this._displacementBedrockBuffers[0] },
                    },
                    {
                        binding: 2,
                        resource: { buffer: this._displacementSedimentBuffers[0] },
                    },
                    {
                        binding: 3,
                        resource: { buffer: this._displacementBedrockBuffers[1] },
                    },
                    {
                        binding: 4,
                        resource: { buffer: this._displacementSedimentBuffers[1] },
                    },
                ]
            }),
            this._serviceProvider.device.createBindGroup({
                label: `${this._name} B Bind Group`,
                layout: bindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: this._uniformConfigBuffer },
                    },
                    {
                        binding: 1,
                        resource: { buffer: this._displacementBedrockBuffers[1] },
                    },
                    {
                        binding: 2,
                        resource: { buffer: this._displacementSedimentBuffers[1] },
                    },
                    {
                        binding: 3,
                        resource: { buffer: this._displacementBedrockBuffers[0] },
                    },
                    {
                        binding: 4,
                        resource: { buffer: this._displacementSedimentBuffers[0] },
                    },
                ]
            })
        ];

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, ComputeShader);
    }

    public appendComputePass(commandEncoder: GPUCommandEncoder): void {
        const computePassEncoder = commandEncoder.beginComputePass();
        computePassEncoder.setPipeline(this._pipeline);
        for (let i = 0; i < this._serviceProvider.settings.thermalErosion.iterations; i++) {
            computePassEncoder.setBindGroup(0, this._bindGroups[0]);
            computePassEncoder.dispatchWorkgroups(this._workgroupCount.x, this._workgroupCount.y, this._workgroupCount.z);
            computePassEncoder.setBindGroup(0, this._bindGroups[1]);
            computePassEncoder.dispatchWorkgroups(this._workgroupCount.x, this._workgroupCount.y, this._workgroupCount.z);
        }
        computePassEncoder.end();
        commandEncoder.copyBufferToTexture(
            {
                buffer: this._displacementBedrockBuffers[0],
                bytesPerRow: this._serviceProvider.textures.displacementErosionBedrock.bytesPerRow,
            },
            this._serviceProvider.textures.displacementErosionBedrock,
            this._serviceProvider.textures.displacementErosionBedrock);
        commandEncoder.copyBufferToTexture(
            {
                buffer: this._displacementSedimentBuffers[0],
                bytesPerRow: this._serviceProvider.textures.displacementErosionSediment.bytesPerRow,
            },
            this._serviceProvider.textures.displacementErosionSediment,
            this._serviceProvider.textures.displacementErosionSediment);
    }

    public configureRun(): void {
        const constants = this._serviceProvider.settings.constants;
        const erosion = this._serviceProvider.settings.thermalErosion;
        const view = new DataView(this._uniformConfigArray);
        let offset = 0;
        view.setInt32(offset, this._serviceProvider.textures.displacementErosion.width, constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        view.setInt32(offset, this._serviceProvider.textures.displacementErosion.height, constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.borderMin.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.borderMin.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;

        view.setFloat32(offset, erosion.borderMin.x + erosion.borderRange.x, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.borderMin.y + erosion.borderRange.y, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.amplitude, constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, erosion.tanThreshold, constants.littleEndian);
        this._serviceProvider.device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public initialize(): void {
        const commandEncoder = this._serviceProvider.device.createCommandEncoder();
        commandEncoder.copyTextureToBuffer(
            this._serviceProvider.textures.displacementErosionBedrock,
            {
                buffer: this._displacementBedrockBuffers[0],
                bytesPerRow: this._serviceProvider.textures.displacementErosionBedrock.bytesPerRow
            },
            this._serviceProvider.textures.displacementErosionBedrock);
        commandEncoder.copyTextureToBuffer(
            this._serviceProvider.textures.displacementErosionSediment,
            {
                buffer: this._displacementSedimentBuffers[0],
                bytesPerRow: this._serviceProvider.textures.displacementErosionSediment.bytesPerRow
            },
            this._serviceProvider.textures.displacementErosionSediment);
        this._serviceProvider.device.queue.submit([commandEncoder.finish()]);
    }
}