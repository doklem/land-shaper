import { Group } from 'three';
import { DisplacementRenderNode } from '../../nodes/render-nodes/displacement-render-node';
import { ErosionComputeNode } from '../../nodes/compute-nodes/erosion-compute-node';
import { BlurRenderNode } from '../../nodes/render-nodes/blur-render-node';
import { Terrain } from '../terrain';
import { ILandscape } from './landscape';
import { SimpleOcean } from '../simple-ocean';
import { IServiceProvider } from '../../services/service-provider';
import { ErosionDifferenceRenderNode } from '../../nodes/render-nodes/erosion-difference-render-node';
import { DisplacementRangeComputeNode } from '../../nodes/compute-nodes/displacement-range-compute-node';
import { IDisplacementDefinition } from '../displacement-definition';
import { DisplacementRadiusComputeNode } from '../../nodes/compute-nodes/displacement-radius-compute-node';

export class ErosionLandscape extends Group implements ILandscape {

    private readonly _blurRenderNode: BlurRenderNode;
    private readonly _displacementRadiusComputeNode: DisplacementRadiusComputeNode;
    private readonly _displacementRangeComputeNode: DisplacementRangeComputeNode;
    private readonly _displacementRenderNode: DisplacementRenderNode;
    private readonly _erosionComputeNode: ErosionComputeNode;
    private readonly _erosionDifferenceRenderNode: ErosionDifferenceRenderNode;
    private readonly _ocean: SimpleOcean;
    private readonly _terrain: Terrain;

    private _running: boolean;

    public get displacement(): IDisplacementDefinition {
        return this._terrain;
    }

    constructor(private readonly _serviceProvider: IServiceProvider) {
        super();

        this._running = false;
        this.applyMatrix4(_serviceProvider.settings.constants.transformation);

        this._displacementRenderNode = new DisplacementRenderNode(_serviceProvider, false);
        this._erosionComputeNode = new ErosionComputeNode(_serviceProvider);
        this._erosionDifferenceRenderNode = new ErosionDifferenceRenderNode(_serviceProvider);
        this._blurRenderNode = new BlurRenderNode(_serviceProvider);
        this._displacementRangeComputeNode = new DisplacementRangeComputeNode(_serviceProvider, _serviceProvider.textures.displacementErosion);
        this._displacementRadiusComputeNode = new DisplacementRadiusComputeNode(
            _serviceProvider,
            _serviceProvider.textures.displacementErosion,
            _serviceProvider.settings.constants.meshSize,
            this._displacementRangeComputeNode.outputBuffers[0],
            this._displacementRangeComputeNode.outputBuffers[1]);

        this._terrain = new Terrain(
            _serviceProvider,
            _serviceProvider.settings.constants.meshSize,
            _serviceProvider.settings.constants.vertexSizeFinalMaximum,
            _serviceProvider.settings.constants.vertexSizeFinalMinimum,
            _serviceProvider.settings.constants.meshLodDistance,
            true,
            undefined,
            this._erosionDifferenceRenderNode,
            this._displacementRenderNode.textureSettings);
        this.add(this._terrain);

        this._ocean = new SimpleOcean(_serviceProvider);
        this.add(this._ocean);
    }

    public applyDebugSettings(): void {
        this._terrain.applyDebugSettings();
        this._ocean.applyDebugSettings();
    }

    public applyWaterSettings(): void {
        this._ocean.applySettings();
    }

    public dispose(): void {
        this._blurRenderNode.dispose();
        this._displacementRadiusComputeNode.dispose();
        this._displacementRangeComputeNode.dispose();
        this._displacementRenderNode.dispose();
        this._erosionComputeNode.dispose();
        this._erosionDifferenceRenderNode.dispose();
        this._ocean.dispose();
        this._terrain.dispose();
    }

    public async runLandscape(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;

        this._displacementRenderNode.configureRun();
        this._displacementRangeComputeNode.configureRun();

        const commandEncoder = this._serviceProvider.device.createCommandEncoder();
        this._displacementRenderNode.appendRenderPass(commandEncoder);
        this._displacementRangeComputeNode.appendComputePass(commandEncoder);
        this._displacementRadiusComputeNode.appendComputePass(commandEncoder);
        this._erosionDifferenceRenderNode.appendRenderPass(commandEncoder);
        this._serviceProvider.device.queue.submit([commandEncoder.finish()]);
        this._erosionComputeNode.setDisplacement();

        await this._terrain.applyRunOutput({
            displacement: this._displacementRenderNode,
            range: this._displacementRangeComputeNode,
            radius: this._displacementRadiusComputeNode
        });
        this._running = false;
    }

    public async runErosion(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;

        this._erosionComputeNode.configureRun();
        this._displacementRangeComputeNode.configureRun();

        const commandEncoder = this._serviceProvider.device.createCommandEncoder();
        this._erosionComputeNode.appendComputePass(commandEncoder);
        //this._erosionDifferenceRenderNode.appendDebugRenderPass(commandEncoder);
        this._displacementRangeComputeNode.appendComputePass(commandEncoder);
        this._displacementRadiusComputeNode.appendComputePass(commandEncoder);
        this._erosionDifferenceRenderNode.appendRenderPass(commandEncoder);
        this._serviceProvider.device.queue.submit([commandEncoder.finish()]);

        await this._terrain.applyRunOutput({
            displacement: this._erosionComputeNode,
            range: this._displacementRangeComputeNode,
            radius: this._displacementRadiusComputeNode
        });
        this._running = false;
    }

    public async runBlur(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;

        this._blurRenderNode.configureRun();
        this._displacementRangeComputeNode.configureRun();

        const commandEncoder = this._serviceProvider.device.createCommandEncoder();
        this._blurRenderNode.appendRenderPass(commandEncoder);
        this._displacementRangeComputeNode.appendComputePass(commandEncoder);
        this._displacementRadiusComputeNode.appendComputePass(commandEncoder);
        this._erosionDifferenceRenderNode.appendRenderPass(commandEncoder);
        this._serviceProvider.device.queue.submit([commandEncoder.finish()]);
        this._erosionComputeNode.setDisplacement();

        await this._terrain.applyRunOutput({
            displacement: this._blurRenderNode,
            range: this._displacementRangeComputeNode,
            radius: this._displacementRadiusComputeNode
        });
        this._running = false;
    }
}