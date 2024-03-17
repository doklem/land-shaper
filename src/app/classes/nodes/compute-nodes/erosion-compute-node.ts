import ComputeShader from './../../../shaders/erosion-compute.wgsl';
import { IDisposable } from '../../disposable';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { BufferManager } from '../../gpu-resources/buffer-manager';
import { Vector2 } from 'three';
import { QuadTree } from './quad-tree';
import { IExportableNode } from '../exportable-node';
import { SettingsManager } from '../../settings/settings-manager';

export class ErosionComputeNode implements IExportableNode, IDisposable {

    private static readonly NAME = 'Erosion';

    private readonly _workgroupSize: number;
    private readonly _uniformConfigBuffer: GPUBuffer;
    private readonly _uniformConfigArray: ArrayBuffer;
    private readonly _name: string;
    private readonly _bindGroup: GPUBindGroup;
    private readonly _pipeline: GPUComputePipeline;
    private readonly _brushBuffer: GPUBuffer;
    private readonly _dropletIterationsBuffer: GPUBuffer;
    private readonly _dropletOffsetsBuffer: GPUBuffer;
    private readonly _dropletOriginsBuffer: GPUBuffer;
    private readonly _displacementBuffer: GPUBuffer;
    private readonly _stagingBuffer: GPUBuffer;

    //private readonly _debugClearBuffer: GPUBuffer;

    private _iterations: number;

    public constructor(
        private readonly _settings: SettingsManager,
        private readonly _device: GPUDevice,
        private readonly _textures: TextureManager) {
        this._name = ErosionComputeNode.NAME;
        this._iterations = 0;
        this._workgroupSize = _settings.constants.erosion.dropletsSize.x * _settings.constants.erosion.dropletsSize.y;

        const brush = ErosionComputeNode.createBrush(_settings.constants.erosion.brushRadius);

        /*this._debugClearBuffer = _device.createBuffer({
            label: `${this._name} Debug Clear Buffer`,
            size: _textures.debug.byteLength,
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.UNIFORM
        });*/

        // buffers
        this._uniformConfigArray = new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * 5
            + Float32Array.BYTES_PER_ELEMENT * 8
            + Float32Array.BYTES_PER_ELEMENT); // WebGPU byte padding
        this._uniformConfigBuffer = _device.createBuffer({
            label: `${this._name} Uniform Config Buffer`,
            size: this._uniformConfigArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });

        const dropletOriginsArray = this.createDropletOrigins();
        this._dropletOriginsBuffer = _device.createBuffer({
            label: `${this._name} Droplet Origins Buffer`,
            size: dropletOriginsArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });
        _device.queue.writeBuffer(this._dropletOriginsBuffer, 0, dropletOriginsArray);

        const dropletOffsetsArray = this.createDropletOffsets(_settings.constants.erosion.dropletOffsetsMinSize)
        this._dropletOffsetsBuffer = _device.createBuffer({
            label: `${this._name} Droplet Offsets Buffer`,
            size: dropletOffsetsArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });
        _device.queue.writeBuffer(this._dropletOffsetsBuffer, 0, dropletOffsetsArray);

        this._dropletIterationsBuffer = _device.createBuffer({
            label: `${this._name} Droplet Iterations Buffer`,
            size: this._workgroupSize * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });

        this._brushBuffer = _device.createBuffer({
            label: `${this._name} Brush Buffer`,
            size: brush.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });
        _device.queue.writeBuffer(this._brushBuffer, 0, brush);

        this._displacementBuffer = _device.createBuffer({
            label: `${this._name} Displacement Buffer`,
            size: _textures.displacementFinal.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE
        });

        this._stagingBuffer = _device.createBuffer({
            label: `${this._name} Staging Buffer`,
            size: this._displacementBuffer.size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });

        this.setDisplacement();

        // bind group layout
        const bindGroupLayout = _device.createBindGroupLayout({
            label: `${this._name} Bind Group Layout`,
            entries: [
                {
                    binding: 0, // config uniforms
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1, // brush
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 2, // droplet origins
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 3, // droplet offsets
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 4, // random states
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                {
                    binding: 5, // displacement
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                /*{
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture:
                    {
                        format: _textures.debug.settings.format,
                        access: 'write-only',
                        viewDimension: _textures.debug.bindingLayout.viewDimension,
                    },
                },*/
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
                {
                    binding: 1,
                    resource: { buffer: this._brushBuffer },
                },
                {
                    binding: 2,
                    resource: { buffer: this._dropletOriginsBuffer },
                },
                {
                    binding: 3,
                    resource: { buffer: this._dropletOffsetsBuffer },
                },
                {
                    binding: 4,
                    resource: { buffer: this._dropletIterationsBuffer },
                },
                {
                    binding: 5,
                    resource: { buffer: this._displacementBuffer },
                },
                /*{
                    binding: 6,
                    resource: _textures.debug.view,
                },*/
            ]
        })

        // pipeline
        this._pipeline = this.createPipeline(bindGroupLayout, ComputeShader);
    }

    public appendComputePass(commandEncoder: GPUCommandEncoder): void {
        /*commandEncoder.copyBufferToTexture(
            {
                buffer: this._debugClearBuffer,
                bytesPerRow: this._textures.debug.bytesPerRow,
            },
            this._textures.debug,
            this._textures.debug
        );*/
        const computePassEncoder = commandEncoder.beginComputePass();
        computePassEncoder.setPipeline(this._pipeline);
        computePassEncoder.setBindGroup(0, this._bindGroup);
        for (let i = 0; i < this._iterations; i++) {
            computePassEncoder.dispatchWorkgroups(this._settings.constants.erosion.dropletsWorkgroupCount);
        }
        computePassEncoder.end();
        commandEncoder.copyBufferToTexture(
            {
                buffer: this._displacementBuffer,
                bytesPerRow: this._textures.displacementFinal.bytesPerRow,
            },
            this._textures.displacementFinal,
            this._textures.displacementFinal);
        commandEncoder.copyBufferToBuffer(this._displacementBuffer, 0, this._stagingBuffer, 0, this._displacementBuffer.size);
    }

    public configureRun(): void {
        this._iterations = this._settings.erosion.iterations;
        const view = new DataView(this._uniformConfigArray);
        let offset = 0;
        view.setUint32(offset, this._textures.displacementFinal.width, this._settings.constants.littleEndian);
        offset += Uint32Array.BYTES_PER_ELEMENT;
        view.setUint32(offset, this._textures.displacementFinal.height, this._settings.constants.littleEndian);
        offset += Uint32Array.BYTES_PER_ELEMENT;
        view.setInt32(offset, this._settings.constants.erosion.brushRadius, this._settings.constants.littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        view.setUint32(offset, this._settings.erosion.maxLifetime, this._settings.constants.littleEndian);
        offset += Uint32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.inertia, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.sedimentCapacityFactor, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.minSedimentCapacity, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.depositSpeed, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.erodeSpeed, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.evaporateSpeed, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.gravity, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.startSpeed, this._settings.constants.littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this._settings.erosion.startWater, this._settings.constants.littleEndian);
        this._device.queue.writeBuffer(this._uniformConfigBuffer, 0, this._uniformConfigArray);
    }

    public dispose(): void {
        this._uniformConfigBuffer.destroy();
        this._stagingBuffer.destroy();
    }

    public async readOutputBuffer(output: Float32Array): Promise<void> {
        output.set(new Float32Array(await BufferManager.readGPUBuffer(this._stagingBuffer)));
    }

    public setDisplacement(): void {
        const commandEncoder = this._device.createCommandEncoder();
        commandEncoder.copyTextureToBuffer(
            this._textures.displacementFinal,
            {
                buffer: this._displacementBuffer,
                bytesPerRow: this._textures.displacementFinal.bytesPerRow
            },
            this._textures.displacementFinal);
        this._device.queue.submit([commandEncoder.finish()]);
        const dropletIterationsArray = new Uint32Array(this._dropletIterationsBuffer.size / Uint32Array.BYTES_PER_ELEMENT);
        let offset = 0;
        for (let i = 0; i < dropletIterationsArray.length; i++) {
            dropletIterationsArray.set([offset], i);
            offset += 4;
        }
        this._device.queue.writeBuffer(this._dropletIterationsBuffer, 0, dropletIterationsArray);
    }

    private createPipeline(bindGroupLayout: GPUBindGroupLayout, shader: string, name?: string, entryPoint?: string): GPUComputePipeline {
        return this._device.createComputePipeline({
            label: `${name ?? this._name} Compute Pipeline`,
            layout: this._device.createPipelineLayout({
                label: `${name ?? this._name} Pipeline Layout`,
                bindGroupLayouts: [bindGroupLayout],
            }),
            compute: {
                module: this._device.createShaderModule({
                    label: `${name ?? this._name} Compute Shader Module`,
                    code: shader,
                }),
                entryPoint: entryPoint ?? 'main',
            },
        });
    }

    private static createBrush(radius: number): Float32Array {
        const offsetsAndWeights: number[] = [];
        const inclusiveDiameter = radius + radius + 1;
        offsetsAndWeights.length = inclusiveDiameter * inclusiveDiameter;
        offsetsAndWeights.fill(0);
        let offset = 0;
        let sum = 0;
        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                const sqrDst = x * x + y * y;
                if (sqrDst < radius * radius) {
                    const weight = 1 - Math.sqrt(sqrDst) / radius;
                    sum += weight;
                    offsetsAndWeights[offset] = weight;
                }
                offset++;
            }
        }
        return new Float32Array(offsetsAndWeights.map(weight => weight / sum));
    }

    private createDropletOrigins(): Uint32Array {
        const dropletOriginArea = new Vector2(
            this._textures.displacementFinal.width / this._settings.constants.erosion.dropletsSize.x,
            this._textures.displacementFinal.height / this._settings.constants.erosion.dropletsSize.y);

        const originIndices: number[] = [];
        let coordinate = new Vector2();
        for(let y = 0; y < this._settings.constants.erosion.dropletsSize.y; y++) {
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
}