import { Scene } from 'three';
import { EditorStageBase } from './editor-stage-base';
import { GUI } from 'lil-gui';
import { TopologyLandscape } from '../objects-3d/landscapes/topology-landscape';
import { TextureManager } from '../gpu-resources/texture-manager';
import { BufferManager } from '../gpu-resources/buffer-manager';
import { SettingsManager } from '../settings/settings-manager';

export class TopologyStage extends EditorStageBase<TopologyLandscape> {

    protected readonly _landscape: TopologyLandscape;

    public readonly helpPageName = 'Topology-Stage';

    constructor(
        settings: SettingsManager,
        scene: Scene,
        gui: GUI,
        textures: TextureManager,
        device: GPUDevice,
        buffers: BufferManager) {
        super(scene);

        const topologyFolder = gui.addFolder('Topology').hide();
        this._uiElements.push(topologyFolder);
        topologyFolder.add(settings.topology, 'seed', -10, 10, 0.005).name('Seed').onChange(async () => await this.runTopology());
        topologyFolder.add(settings.topology, 'octaveCount', 1, 15, 1).name('Octaves').onChange(async () => await this.runTopology());
        topologyFolder.add(settings.topology.offset, 'x', -300, 300, 0.01).name('Offset X').onChange(async () => await this.runTopology());
        topologyFolder.add(settings.topology.offset, 'y', -300, 300, 0.01).name('Offset Y').onChange(async () => await this.runTopology());
        topologyFolder.add(settings.topology.offset, 'z', -150, 150, 0.5).name('Offset Z').onChange(async () => await this.runTopology());
        topologyFolder.add(settings.topology.scale, 'x', 0, 0.1, 0.0001).name('Scale X').onChange(async () => await this.runTopology());
        topologyFolder.add(settings.topology.scale, 'y', 0, 0.1, 0.0001).name('Scale Y').onChange(async () => await this.runTopology());
        topologyFolder.add(settings.topology.scale, 'z', 0, 200, 0.05).name('Scale Z').onChange(async () => await this.runTopology());
        topologyFolder.add(settings.topology.turbulence, 'x', 0, 1, 0.01).name('Turbulence X').onChange(async () => await this.runTopology());
        topologyFolder.add(settings.topology.turbulence, 'y', 0, 1, 0.01).name('Turbulence Y').onChange(async () => await this.runTopology());
        topologyFolder.add(settings.topology, 'ridgeThreshold', -1, 1, 0.01).name('Ridge Threshold').onChange(async () => await this.runTopology());

        this._landscape = new TopologyLandscape(settings, textures, device, buffers);
        this._sceneElements.push(this._landscape);
    }

    private async runTopology(): Promise<void> {
        this.changed = true;
        await this._landscape.runLandscape();
    }
}
