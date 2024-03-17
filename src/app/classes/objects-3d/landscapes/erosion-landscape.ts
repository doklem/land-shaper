import { DataTexture, Group } from 'three';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { BufferManager } from '../../gpu-resources/buffer-manager';
import { DisplacementRenderNode } from '../../nodes/render-nodes/displacement-render-node';
import { ErosionComputeNode } from '../../nodes/compute-nodes/erosion-compute-node';
import { BlurRenderNode } from '../../nodes/render-nodes/blur-render-node';
import { Terrain } from '../terrain';
import { IExportableNode } from '../../nodes/exportable-node';
import { ILandscape } from './landscape';
import { SettingsManager } from '../../settings/settings-manager';
import { SimpleOcean } from '../simple-ocean';

export class ErosionLandscape extends Group implements ILandscape {

    private readonly _blurRenderNode: BlurRenderNode;
    private readonly _displacementRenderNode: DisplacementRenderNode;
    private readonly _erosionComputeNode: ErosionComputeNode;
    private readonly _ocean: SimpleOcean;
    private readonly _terrain: Terrain;

    private _running: boolean;

    public get displacementMap(): DataTexture {
        return this._terrain.displacementMap;
    }

    constructor(
        settings: SettingsManager,
        textures: TextureManager,
        private readonly _device: GPUDevice,
        buffers: BufferManager) {
        super();

        this._running = false;
        this.applyMatrix4(settings.constants.transformation);

        this._displacementRenderNode = new DisplacementRenderNode(settings, _device, buffers, textures, false);
        this._erosionComputeNode = new ErosionComputeNode(settings, _device, textures);
        this._blurRenderNode = new BlurRenderNode(settings, _device, buffers, textures);

        this._terrain = new Terrain(
            settings,
            settings.constants.meshSize,
            settings.constants.vertexSizeFinalMaximum,
            settings.constants.vertexSizeFinalMinimum,
            settings.constants.meshLodDistance,
            true,
            this._displacementRenderNode.textureSettings);
        this.add(this._terrain);

        this._ocean = new SimpleOcean(settings);
        this.add(this._ocean);
    }

    public applyDebugSettings(): void {
        this._terrain.applyDebugSettings();
    }

    public applyWaterSettings(): void {
        this._ocean.applySettings();
    }

    public dispose(): void {
        this._blurRenderNode.dispose();
        this._displacementRenderNode.dispose();
        this._erosionComputeNode.dispose();
        this._ocean.dispose();
        this._terrain.dispose();
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
        this._erosionComputeNode.setDisplacement();

        await this.applyRunOutput(this._displacementRenderNode);
        this._running = false;
    }

    public async runErosion(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;

        this._erosionComputeNode.configureRun();

        const commandEncoder = this._device.createCommandEncoder();
        this._erosionComputeNode.appendComputePass(commandEncoder);
        this._device.queue.submit([commandEncoder.finish()]);

        await this.applyRunOutput(this._erosionComputeNode);
        this._running = false;
    }

    public async runBlur(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;

        this._blurRenderNode.configureRun();

        const commandEncoder = this._device.createCommandEncoder();
        this._blurRenderNode.appendRenderPass(commandEncoder);
        this._device.queue.submit([commandEncoder.finish()]);
        this._erosionComputeNode.setDisplacement();

        await this.applyRunOutput(this._blurRenderNode);
        this._running = false;
    }

    private async applyRunOutput(displacementProvider: IExportableNode): Promise<void> {
        await this._terrain.applyRunOutput(displacementProvider);
    }
}