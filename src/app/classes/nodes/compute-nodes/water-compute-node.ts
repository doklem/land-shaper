import ComputeShader from './../../../shaders/water-compute.wgsl';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { Vector2 } from 'three';
import { QuadTree } from './quad-tree';
import { ComputeNodeBase } from './compute-node-base';
import { SettingsManager } from '../../settings/settings-manager';

export class WaterComputeNode extends ComputeNodeBase {

    private static readonly WORKGROUP_SIZE = 64;

    public static readonly NAME = 'Water';

    private readonly _workgroupSize: number;
    private readonly _uniformConfigBuffer: GPUBuffer;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _dropletIterationsBuffer: GPUBuffer;
    private readonly _dropletOffsetsBuffer: GPUBuffer;
    private readonly _dropletOriginsBuffer: GPUBuffer;

    protected override readonly _bindGroup: GPUBindGroup;
    protected override readonly _pipeline: GPUComputePipeline;

    public constructor(
        private readonly _settings: SettingsManager,
        device: GPUDevice,
        private readonly _textures: TextureManager) {
        super(
            WaterComputeNode.NAME,
            device,
            WaterComputeNode.getWorkgroupCount(device, _textures),
            _textures.water.settings);

        this._workgroupSize = _settings.constants.erosion.dropletsSize.x * _settings.constants.erosion.dropletsSize.y;

        // buffers
        this._uniformConfigArray = new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * 3 + Float32Array.BYTES_PER_ELEMENT * 5);
        this._uniformConfigBuffer = device.createBuffer({
            label: `${this._name} Uniform Config Buffer`,
            size: this._uniformConfigArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });

        const dropletOriginsArray = this.createDropletOrigins();
        this._dropletOriginsBuffer = device.createBuffer({
            label: `${this._name} Droplet Origins Buffer`,
            size: dropletOriginsArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });
        device.queue.writeBuffer(this._dropletOriginsBuffer, 0, dropletOriginsArray);

        const dropletOffsetsArray = this.createDropletOffsets(_settings.constants.erosion.dropletOffsetsMinSize)
        this._dropletOffsetsBuffer = device.createBuffer({
            label: `${this._name} Droplet Offsets Buffer`,
            size: dropletOffsetsArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });
        device.queue.writeBuffer(this._dropletOffsetsBuffer, 0, dropletOffsetsArray);

        this._dropletIterationsBuffer = device.createBuffer({
            label: `${this._name} Droplet Iterations Buffer`,
            size: this._workgroupSize * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });

        // bind group layout
        const bindGroupLayout = this.createBindGroupLayout(
            [
                {
                    binding: 0, // config uniforms
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1, // droplet origins
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 2, // droplet offsets
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 3, // droplet iterations
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                {
                    binding: 4, // displacement
                    visibility: GPUShaderStage.COMPUTE,
                    texture: _textures.displacementFinal.bindingLayout,
                },
                {
                    binding: 5, // float sampler
                    visibility: GPUShaderStage.COMPUTE,
                    sampler: { type: _textures.displacementFinal.settings.samplerBinding },
                },
                {
                    binding: 6, // water
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
            ]
        );

        // bind group
        this._bindGroup = this.createBindGroup(
            bindGroupLayout,
            [
                {
                    binding: 0,
                    resource: { buffer: this._uniformConfigBuffer },
                },
                {
                    binding: 1,
                    resource: { buffer: this._dropletOriginsBuffer },
                },
                {
                    binding: 2,
                    resource: { buffer: this._dropletOffsetsBuffer },
                },
                {
                    binding: 3,
                    resource: { buffer: this._dropletIterationsBuffer },
                },
                {
                    binding: 4,
                    resource: _textures.displacementFinal.view,
                },
                {
                    binding: 5,
                    resource: _textures.floatSampler,
                },
                {
                    binding: 6,
                    resource: { buffer: this.outputBuffer },
                },
            ]
        );

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, ComputeShader);
    }

    public override appendComputePass(commandEncoder: GPUCommandEncoder): void {
        commandEncoder.clearBuffer(this.outputBuffer);
        super.appendComputePass(commandEncoder);
    }

    public configureRun(): void {
        const view = new DataView(this._uniformConfigArray);
        let offset = 0;
        view.setUint32(offset, this._textures.displacementFinal.width, this._settings.constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        view.setUint32(offset, this._textures.displacementFinal.height, this._settings.constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        view.setUint32(offset, this._settings.erosion.maxLifetime, this._settings.constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.inertia, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.evaporateSpeed, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.gravity, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.startSpeed, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.startWater, this._settings.constants.littleEndian);
        this._device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);

        const dropletIterationsArray = new Uint32Array(this._dropletIterationsBuffer.size / Uint32Array.BYTES_PER_ELEMENT);
        offset = 0;
        for (let i = 0; i < dropletIterationsArray.length; i++) {
            dropletIterationsArray.set([offset], i);
            offset += 4;
        }
        this._device.queue.writeBuffer(this._dropletIterationsBuffer, 0, dropletIterationsArray);
    }

    public override dispose(): void {
        super.dispose();
        this._uniformConfigBuffer.destroy();
    }

    protected override appendToCommandEncoder(commandEncoder: GPUCommandEncoder): void {
        this.appendCopyOutputToTexture(commandEncoder, this._textures.water);
    }

    private createDropletOrigins(): Uint32Array {
        const dropletOriginArea = new Vector2(
            this._textures.displacementFinal.width / this._settings.constants.erosion.dropletsSize.x,
            this._textures.displacementFinal.height / this._settings.constants.erosion.dropletsSize.y);

        const originIndices: number[] = [];
        let coordinate = new Vector2();
        for (let y = 0; y < this._settings.constants.erosion.dropletsSize.y; y++) {
            for (let x = 0; x < this._settings.constants.erosion.dropletsSize.x; x++) {
                originIndices.push(coordinate.y * this._textures.displacementFinal.width + coordinate.x);
                coordinate.setX(coordinate.x + dropletOriginArea.x);
            }
            coordinate.set(0, coordinate.y + dropletOriginArea.y);
        }

        return new Uint32Array(originIndices);
    }

    private createDropletOffsets(minSize: number): Float32Array {
        const dropletOriginArea = new Vector2(
            this._textures.displacementFinal.width / this._settings.constants.erosion.dropletsSize.x,
            this._textures.displacementFinal.height / this._settings.constants.erosion.dropletsSize.y);
        const quadTree = new QuadTree(new Vector2(), dropletOriginArea, minSize);
        const offsets: number[] = [];
        const totalOffsets = dropletOriginArea.x * dropletOriginArea.y;
        let coordinate: Vector2;
        for (let i = 0; i < totalOffsets; i++) {
            coordinate = quadTree.nextPosition();
            offsets.push(coordinate.x);
            offsets.push(coordinate.y);
        }
        return new Float32Array(offsets);
    }

    private static getWorkgroupCount(device: GPUDevice, textures: TextureManager): number {
        // Each pixel should be exactly once the origin of a droplet with this.
        const workgroupCount = (textures.water.settings.width * textures.water.settings.height) / WaterComputeNode.WORKGROUP_SIZE;
        return Math.min(workgroupCount, device.limits.maxComputeWorkgroupsPerDimension);
    }
}