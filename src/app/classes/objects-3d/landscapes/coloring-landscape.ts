import { DataTexture, Group, Vector2 } from 'three';
import { NormalObjectSpaceRenderNode } from '../../nodes/render-nodes/normal-object-space-render-node';
import { NormalTangentSpaceRenderNode } from '../../nodes/render-nodes/normal-tangent-space-render-node';
import { DiffuseRenderNode } from '../../nodes/render-nodes/diffuse-render-node';
import { RubbleComputeNode } from '../../nodes/compute-nodes/rubbel-compute-node';
import { Rubble } from '../rubble';
import { SurfaceRenderNode } from '../../nodes/render-nodes/surface-render-node';
import { Terrain } from '../terrain';
import { ILandscape } from './landscape';
import { WaterComputeNode } from '../../nodes/compute-nodes/water-compute-node';
import { Ocean } from '../ocean';
import { IServiceProvider } from '../../services/service-provider';

export class ColoringLandscape extends Group implements ILandscape {

    private readonly _diffuseRenderNode: DiffuseRenderNode;
    private readonly _normalObjectSpaceRenderNode: NormalObjectSpaceRenderNode;
    private readonly _normalTangentSpaceRenderNode: NormalTangentSpaceRenderNode;
    private readonly _rubble: Rubble;
    private readonly _rubbleComputeNode: RubbleComputeNode;
    private readonly _ocean: Ocean;
    private readonly _surfaceRenderNode: SurfaceRenderNode;
    private readonly _terrain: Terrain;
    private readonly _waterComputeNode: WaterComputeNode;

    private _running: boolean;

    constructor(
        private readonly _serviceProvider: IServiceProvider,
        displacementMap: DataTexture) {
        super();

        this._running = false;
        this.applyMatrix4(_serviceProvider.settings.constants.transformation);
        const uvRange = new Vector2(1, 1);

        this._normalObjectSpaceRenderNode = new NormalObjectSpaceRenderNode(_serviceProvider, uvRange, _serviceProvider.textures.displacementErosion, _serviceProvider.textures.normalObjectSpace);
        this._normalTangentSpaceRenderNode = new NormalTangentSpaceRenderNode(_serviceProvider, _serviceProvider.textures.normalObjectSpace, _serviceProvider.textures.normalTangentSpace);
        this._diffuseRenderNode = new DiffuseRenderNode(_serviceProvider, uvRange, _serviceProvider.textures.surface, _serviceProvider.textures.displacementErosion, _serviceProvider.textures.diffuse);
        this._rubbleComputeNode = new RubbleComputeNode(_serviceProvider, uvRange, _serviceProvider.textures.rubbleTexture);
        this._surfaceRenderNode = new SurfaceRenderNode(_serviceProvider, uvRange, _serviceProvider.textures.normalObjectSpace, _serviceProvider.textures.displacementErosion, _serviceProvider.textures.water, _serviceProvider.textures.surface);
        this._waterComputeNode = new WaterComputeNode(_serviceProvider);

        this._rubble = new Rubble(_serviceProvider, _serviceProvider.settings.constants.meshLodDistance, this._rubbleComputeNode);
        this._rubble.translateX(_serviceProvider.settings.constants.meshSize.x * -0.5);
        this._rubble.translateY(_serviceProvider.settings.constants.meshSize.y * -0.5);
        this.add(this._rubble);

        this._ocean = new Ocean(_serviceProvider);
        this.add(this._ocean);

        this._terrain = new Terrain(
            _serviceProvider,
            _serviceProvider.settings.constants.meshSize,
            _serviceProvider.settings.constants.vertexSizeFinalMaximum,
            _serviceProvider.settings.constants.vertexSizeFinalMinimum,
            _serviceProvider.settings.constants.meshLodDistance,
            false,
            this._normalTangentSpaceRenderNode,
            this._diffuseRenderNode,
            _serviceProvider.textures.displacementErosion.settings,
            displacementMap);
        this.add(this._terrain);
    }

    public animate(delta: number): void {
        this._ocean.animate(delta);
    }

    public applyDebugSettings(): void {
        this._terrain.applyDebugSettings();
    }

    public applyWaterSettings(): void {
        this._ocean.applySettings();
    }

    public dispose(): void {
        this._diffuseRenderNode.dispose();
        this._normalObjectSpaceRenderNode.dispose();
        this._normalTangentSpaceRenderNode.dispose();
        this._rubbleComputeNode.dispose();
        this._ocean.dispose();
        this._surfaceRenderNode.dispose();
        this._terrain.dispose();
        this._rubble.dispose();
        this._waterComputeNode.dispose();
    }

    public async runLandscape(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;

        this._waterComputeNode.configureRun();
        this.configureRun();

        const commandEncoder = this._serviceProvider.device.createCommandEncoder();
        this._waterComputeNode.appendComputePass(commandEncoder);
        this.submitRun(commandEncoder);

        await this.applyRunOutput(this._terrain.applyRunOutput());
        this._running = false;
    }

    public async runDiffuse(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;

        this.configureRun();

        const commandEncoder = this._serviceProvider.device.createCommandEncoder();
        this.submitRun(commandEncoder);

        await this.applyRunOutput(this._terrain.updateDiffuse());
        this._running = false;
    }

    private async applyRunOutput(terrainPromise: Promise<void>): Promise<void> {
        await Promise.all([terrainPromise, this._rubble.applyRunOutput()]);
    }

    private configureRun(): void {
        this._normalObjectSpaceRenderNode.configureRun();
        this._surfaceRenderNode.configureRun();
        this._diffuseRenderNode.configureRun();
        this._rubbleComputeNode.configureRun();
    }

    private submitRun(commandEncoder: GPUCommandEncoder): void {
        this._normalObjectSpaceRenderNode.appendRenderPass(commandEncoder);
        this._normalTangentSpaceRenderNode.appendRenderPass(commandEncoder);
        this._surfaceRenderNode.appendRenderPass(commandEncoder);
        this._diffuseRenderNode.appendRenderPass(commandEncoder);
        this._rubbleComputeNode.appendComputePass(commandEncoder);
        this._serviceProvider.device.queue.submit([commandEncoder.finish()]);
    }
}