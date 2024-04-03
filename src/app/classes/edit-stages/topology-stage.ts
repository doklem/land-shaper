import { EditStageBase } from './edit-stage-base';
import { TopologyLandscape } from '../objects-3d/landscapes/topology-landscape';
import { IServiceProvider } from '../services/service-provider';
import { GUI } from 'lil-gui';

export class TopologyStage extends EditStageBase<TopologyLandscape> {

    protected readonly _landscape: TopologyLandscape;

    public readonly helpPageName = 'Topology-Stage';

    constructor(serviceProvider: IServiceProvider) {
        super(serviceProvider);
        this._landscape = new TopologyLandscape(serviceProvider);
        this._sceneElements.push(this._landscape);
    }

    public override addGUI(parent: GUI): void {
        const topology = this._serviceProvider.settings.topology;
        const topologyFolder = parent.addFolder('Topology').hide();
        this._folders.push(topologyFolder);
        topologyFolder.add(topology, 'seed', -10, 10, 0.005).name('Seed').onChange(async () => await this.runTopology());
        topologyFolder.add(topology, 'octaves', 1, 15, 1).name('Octaves').onChange(async () => await this.runTopology());
        topologyFolder.add(topology.offset, 'x', -300, 300, 0.01).name('Offset X').onChange(async () => await this.runTopology());
        topologyFolder.add(topology.offset, 'y', -300, 300, 0.01).name('Offset Y').onChange(async () => await this.runTopology());
        topologyFolder.add(topology.offset, 'z', -150, 150, 0.5).name('Offset Z').onChange(async () => await this.runTopology());
        topologyFolder.add(topology.scale, 'x', 0, 0.1, 0.0001).name('Scale X').onChange(async () => await this.runTopology());
        topologyFolder.add(topology.scale, 'y', 0, 0.1, 0.0001).name('Scale Y').onChange(async () => await this.runTopology());
        topologyFolder.add(topology.scale, 'z', 0, 200, 0.05).name('Scale Z').onChange(async () => await this.runTopology());
        topologyFolder.add(topology, 'rotationAngle', 0, 359.9, 0.1).name('Rotation Angle').onChange(async () => await this.runTopology());
        topologyFolder.add(topology.rotationOffset, 'x', -300, 300, 0.001).name('Rotation Offset X').onChange(async () => await this.runTopology());
        topologyFolder.add(topology.rotationOffset, 'y', -300, 300, 0.001).name('Rotation Offset Y').onChange(async () => await this.runTopology());
        topologyFolder.add(topology.turbulence, 'x', 0, 1, 0.01).name('Turbulence X').onChange(async () => await this.runTopology());
        topologyFolder.add(topology.turbulence, 'y', 0, 1, 0.01).name('Turbulence Y').onChange(async () => await this.runTopology());
        topologyFolder.add(topology, 'ridgeThreshold', -1, 1, 0.01).name('Ridge Threshold').onChange(async () => await this.runTopology());
    }

    private async runTopology(): Promise<void> {
        if (!this._visible) {
            return;
        }
        this.changed = true;
        await this._landscape.runLandscape();
    }
}
