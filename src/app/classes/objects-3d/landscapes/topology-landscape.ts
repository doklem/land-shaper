import { DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { BufferManager } from '../../gpu-resources/buffer-manager';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { DisplacementRenderNode } from '../../nodes/render-nodes/displacement-render-node';
import { ILandscape } from './landscape';
import { SettingsManager } from '../../settings/settings-manager';
import { SimpleOcean } from '../simple-ocean';

export class TopologyLandscape extends Group implements ILandscape {

    private readonly _displacementRenderNode: DisplacementRenderNode;
    private readonly _displacementOutput: Float32Array;
    private readonly _terrain: Mesh<PlaneGeometry, MeshStandardMaterial>;
    private readonly _ocean: SimpleOcean;

    private _running: boolean;

    constructor(
        private readonly _settings: SettingsManager,
        textures: TextureManager,
        private readonly _device: GPUDevice,
        buffers: BufferManager) {
        super();
        this._running = false;
        this.applyMatrix4(_settings.constants.transformation);

        this._displacementRenderNode = new DisplacementRenderNode(_settings, _device, buffers, textures, true);
        this._displacementOutput = new Float32Array(this._displacementRenderNode.textureSettings.length);

        this._terrain = new Mesh(
            new PlaneGeometry(_settings.constants.meshSize.x, _settings.constants.meshSize.y, _settings.constants.vertexSizeDraft.x, _settings.constants.vertexSizeDraft.y),
            new MeshStandardMaterial({
                color: 0x86B036,
                displacementScale: 1,
                displacementMap: TextureManager.createDataTexture(this._displacementOutput, this._displacementRenderNode.textureSettings),
                flatShading: true,
                metalness: 0,
                roughness: 1,
                side: DoubleSide,
            })
        );
        this._terrain.material.displacementMap!.needsUpdate = true;
        this._terrain.castShadow = false;
        this._terrain.receiveShadow = true;
        this.add(this._terrain);

        this._ocean = new SimpleOcean(_settings);
        this.add(this._ocean);
    }
    
    public dispose(): void {
        this._terrain.geometry.dispose();
        TextureManager.disposeMaterialTextures(this._terrain.material);
        this._terrain.material.dispose();
        this._displacementRenderNode.dispose();
        this._ocean.dispose();
    }

    public async runLandscape(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;
        this._displacementRenderNode.configureRun();

        const commandEncoder = this._device.createCommandEncoder();
        this._displacementRenderNode.appendRenderPass(commandEncoder);
        this._device.queue.submit([commandEncoder.finish()]);

        await this._displacementRenderNode.readOutputBuffer(this._displacementOutput);
        this._terrain.material.displacementMap!.needsUpdate = true;
        this._terrain.material.needsUpdate = true;
        this._running = false;
    }

    public applyDebugSettings(): void {
        this._terrain.material.wireframe = this._settings.debug.wireframe;
        this._terrain.material.needsUpdate = true;
    }

    public applyWaterSettings(): void {
        this._ocean.applySettings();
    }
}