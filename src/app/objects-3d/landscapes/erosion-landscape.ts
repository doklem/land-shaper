import { Group } from 'three';
import { DisplacementRenderNode } from '../../nodes/render-nodes/displacement-render-node';
import { DropletErosionComputeNode } from '../../nodes/compute-nodes/droplet-erosion-compute-node';
import { ILandscape } from './landscape';
import { SimpleOcean } from '../simple-ocean';
import { IServiceProvider } from '../../services/service-provider';
import { ErosionDifferenceRenderNode } from '../../nodes/render-nodes/erosion-difference-render-node';
import { DisplacementRangeComputeNode } from '../../nodes/compute-nodes/displacement-range-compute-node';
import { IDisplacementSource } from '../terrains/displacement-source';
import { DisplacementRadiusComputeNode } from '../../nodes/compute-nodes/displacement-radius-compute-node';
import { ThermalErosionComputeNode } from '../../nodes/compute-nodes/thermal-erosion-compute-node';
import { DisplacementSourceTerrain } from '../terrains/displacement-source-terrain';
import { AddRenderNode } from '../../nodes/render-nodes/add-render-node';

export class ErosionLandscape extends Group implements ILandscape {

    private readonly _displacementErosionRenderNode: AddRenderNode;
    private readonly _displacementRadiusComputeNode: DisplacementRadiusComputeNode;
    private readonly _displacementRangeComputeNode: DisplacementRangeComputeNode;
    private readonly _displacementRenderNode: DisplacementRenderNode;
    private readonly _dropletErosionComputeNode: DropletErosionComputeNode;
    private readonly _erosionDifferenceRenderNode: ErosionDifferenceRenderNode;
    private readonly _ocean: SimpleOcean;
    private readonly _terrain: DisplacementSourceTerrain;
    private readonly _thermalErosionComputeNode: ThermalErosionComputeNode;

    private _running: boolean;

    public get displacement(): IDisplacementSource {
        return this._terrain;
    }

    constructor(private readonly _serviceProvider: IServiceProvider) {
        super();

        this._running = false;
        this.applyMatrix4(_serviceProvider.settings.constants.transformation);

        this._displacementRenderNode = new DisplacementRenderNode(_serviceProvider, false);
        this._dropletErosionComputeNode = new DropletErosionComputeNode(_serviceProvider);
        this._erosionDifferenceRenderNode = new ErosionDifferenceRenderNode(_serviceProvider);
        this._displacementRangeComputeNode = new DisplacementRangeComputeNode(_serviceProvider, _serviceProvider.textures.displacementErosion);
        this._displacementRadiusComputeNode = new DisplacementRadiusComputeNode(
            _serviceProvider,
            _serviceProvider.textures.displacementErosion,
            _serviceProvider.settings.constants.meshSize,
            this._displacementRangeComputeNode.minBuffer,
            this._displacementRangeComputeNode.maxBuffer);
        this._thermalErosionComputeNode = new ThermalErosionComputeNode(_serviceProvider);
        this._displacementErosionRenderNode = new AddRenderNode(
            _serviceProvider,
            _serviceProvider.textures.displacementErosionBedrock,
            _serviceProvider.textures.displacementErosionSediment,
            _serviceProvider.textures.displacementErosion);

        this._terrain = new DisplacementSourceTerrain(
            _serviceProvider,
            _serviceProvider.settings.constants.meshSize,
            _serviceProvider.settings.constants.vertexSizeFinalMaximum,
            _serviceProvider.settings.constants.vertexSizeFinalMinimum,
            _serviceProvider.settings.constants.meshLodDistance,
            true,
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
        this._displacementErosionRenderNode.dispose();
        this._displacementRadiusComputeNode.dispose();
        this._displacementRangeComputeNode.dispose();
        this._displacementRenderNode.dispose();
        this._dropletErosionComputeNode.dispose();
        this._erosionDifferenceRenderNode.dispose();
        this._thermalErosionComputeNode.dispose();
        this._ocean.dispose();
        this._terrain.dispose();
    }

    public async runDropletErosion(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;

        this._dropletErosionComputeNode.initialize();
        this._dropletErosionComputeNode.configureRun();
        this._displacementRangeComputeNode.configureRun();

        const commandEncoder = this._serviceProvider.device.createCommandEncoder();
        this._dropletErosionComputeNode.appendComputePass(commandEncoder);
        this._displacementErosionRenderNode.appendRenderPass(commandEncoder);
        this._displacementRangeComputeNode.appendComputePass(commandEncoder);
        this._displacementRadiusComputeNode.appendComputePass(commandEncoder);
        this._erosionDifferenceRenderNode.appendRenderPass(commandEncoder);
        //this._erosionDifferenceRenderNode.appendDebugRenderPass(commandEncoder);
        this._serviceProvider.device.queue.submit([commandEncoder.finish()]);

        await this._terrain.applyRunOutput(
            this._displacementErosionRenderNode,
            this._displacementRangeComputeNode,
            this._displacementRadiusComputeNode);
        this._running = false;
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
        this._dropletErosionComputeNode.initialize();
        this._thermalErosionComputeNode.initialize();

        await this._terrain.applyRunOutput(
            this._displacementRenderNode,
            this._displacementRangeComputeNode,
            this._displacementRadiusComputeNode);
        this._running = false;
    }

    public async runThermalErosion(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;

        this._thermalErosionComputeNode.initialize();
        this._thermalErosionComputeNode.configureRun();
        this._displacementRangeComputeNode.configureRun();

        const commandEncoder = this._serviceProvider.device.createCommandEncoder();
        this._thermalErosionComputeNode.appendComputePass(commandEncoder);
        this._displacementErosionRenderNode.appendRenderPass(commandEncoder);
        this._displacementRangeComputeNode.appendComputePass(commandEncoder);
        this._displacementRadiusComputeNode.appendComputePass(commandEncoder);
        this._erosionDifferenceRenderNode.appendRenderPass(commandEncoder);
        //this._erosionDifferenceRenderNode.appendDebugRenderPass(commandEncoder);
        this._serviceProvider.device.queue.submit([commandEncoder.finish()]);

        await this._terrain.applyRunOutput(
            this._displacementErosionRenderNode,
            this._displacementRangeComputeNode,
            this._displacementRadiusComputeNode);
        this._running = false;
    }
}