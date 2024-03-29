import VertexShader from './../../shaders/clip-space-quad-vertex.wgsl';
import { IDisposable } from '../disposable';

export class BufferService implements IDisposable {

    public readonly clipSpaceQuadVertexBuffer: GPUBuffer;
    public readonly clipSpaceQuadVertexBufferLayout: GPUVertexBufferLayout;
    public readonly clipSpaceQuadVertexState: GPUVertexState;

    constructor(device: GPUDevice) {

        // clip space quad
        const vertices = new Float32Array([
            -1, -1,
            1, -1,
            1, 1,

            -1, -1,
            1, 1,
            -1, 1
        ]);
        this.clipSpaceQuadVertexBuffer = device.createBuffer({
            label: 'Clip Space Quad Vertex Buffer',
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(this.clipSpaceQuadVertexBuffer, 0, vertices);
        this.clipSpaceQuadVertexBufferLayout = {
            arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
            attributes: [
                {
                    format: 'float32x2',
                    offset: 0,
                    shaderLocation: 0
                }
            ]
        };
        this.clipSpaceQuadVertexState = {
            module: device.createShaderModule({
                label: 'Clip Space Quad Vertex Shader Module',
                code: VertexShader
            }),
            entryPoint: 'main',
            buffers: [
                {
                    arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
                    attributes: [
                        {
                            format: 'float32x2',
                            offset: 0,
                            shaderLocation: 0
                        }
                    ]
                }
            ],
        };
    }

    public drawClipSpaceQuad(renderPassEncoder: GPURenderPassEncoder | GPURenderBundleEncoder): void {
        renderPassEncoder.setVertexBuffer(0, this.clipSpaceQuadVertexBuffer);
        renderPassEncoder.draw(6); // Quad has two triangles, each with three vertices.
    }

    //ToDo: Reevaluat the need for this method, when the following PR is merged: Request for a GPUQueue readBuffer API, https://github.com/gpuweb/gpuweb/issues/1972    
    public static async readGPUBuffer(stagingBuffer: GPUBuffer): Promise<ArrayBuffer> {
        await stagingBuffer.mapAsync(GPUMapMode.READ, 0, stagingBuffer.size);
        const copyArrayBuffer = stagingBuffer.getMappedRange(0, stagingBuffer.size);
        const data = copyArrayBuffer.slice(0, stagingBuffer.size);
        stagingBuffer.unmap();
        return data;
    }

    public dispose(): void {
        this.clipSpaceQuadVertexBuffer.destroy();
    }
}