import { DataTexture, Scene } from 'three';
import { EditorStageBase } from './editor-stage-base';
import { GUI } from 'lil-gui';
import { TextureManager } from '../gpu-resources/texture-manager';
import { BufferManager } from '../gpu-resources/buffer-manager';
import { MixedColorSettings } from '../settings/mixed-color-settings';
import { ColoringLandscape } from '../objects-3d/landscapes/coloring-landscape';
import { MeshManager } from '../gpu-resources/mesh-manager';
import { SettingsManager } from '../settings/settings-manager';
export class ColoringStage extends EditorStageBase<ColoringLandscape> {

    protected readonly _landscape: ColoringLandscape;

    public readonly helpPageName = 'Coloring-Stage';

    constructor(
        settings: SettingsManager,
        scene: Scene,
        gui: GUI,
        textures: TextureManager,
        device: GPUDevice,
        buffers: BufferManager,
        meshs: MeshManager,
        displacementMap: DataTexture) {
        super(scene);

        const diffuseFolder = gui.addFolder('Colors').hide();
        this._folders.push(diffuseFolder);
        diffuseFolder.add(settings.diffuse, 'slopStart', 0, 1, 0.001).name('Slop Angle').onChange(() => this.runDiffuse());
        diffuseFolder.add(settings.diffuse, 'slopRange', 0, 10, 0.01).name('Slop Gradient').onChange(() => this.runDiffuse());
        diffuseFolder.add(settings.diffuse, 'riverStart', 0, 100, 0.1).name('River Start').onChange(() => this.runDiffuse());
        diffuseFolder.add(settings.diffuse, 'riverRange', 0, 100, 0.1).name('River Gradient').onChange(() => this.runDiffuse());
        diffuseFolder.add(settings.diffuse, 'shoreStart', -100, 100, 0.1).name('Shore Start Height').onChange(() => this.runDiffuse());
        diffuseFolder.add(settings.diffuse, 'shoreRange', 0, 200, 0.1).name('Shore Gradient').onChange(() => this.runDiffuse());

        const bumpsFolder = diffuseFolder.addFolder('Normal Bumps').close().hide();
        this._folders.push(bumpsFolder);
        bumpsFolder.add(settings.normals, 'seed', -10, 10, 0.1).name('Seed').onChange(() => this.runDiffuse());
        bumpsFolder.add(settings.normals, 'octaves', 1, 15, 1).name('Octaves').onChange(() => this.runDiffuse());
        bumpsFolder.add(settings.normals, 'amplitude', 0, 0.1, 0.01).name('Amplitude').onChange(() => this.runDiffuse());
        bumpsFolder.add(settings.normals.scale, 'x', 0, 1000, 1).name('Scale X').onChange(() => this.runDiffuse());
        bumpsFolder.add(settings.normals.scale, 'y', 0, 1000, 1).name('Scale Y').onChange(() => this.runDiffuse());

        MixedColorSettings.createGUI(settings.diffuse.vegetation, diffuseFolder, 'Vegetation', () => this.runDiffuse());
        MixedColorSettings.createGUI(settings.diffuse.bedrock, diffuseFolder, 'Bedrock', () => this.runDiffuse());
        MixedColorSettings.createGUI(settings.diffuse.gravel, diffuseFolder, 'Gravel', () => this.runDiffuse());

        const rubbleFolder = diffuseFolder.addFolder('Rubble').close().hide();
        this._folders.push(rubbleFolder);
        rubbleFolder.add(settings.rubble, 'slopStart', 0, 1, 0.001).name('Slop Angle').onChange(() => this.runDiffuse());
        rubbleFolder.add(settings.rubble, 'slopRange', 0, 10, 0.01).name('Slop Gradient').onChange(() => this.runDiffuse());
        rubbleFolder.add(settings.rubble.scaleFactor, 'x', 0, 10, 0.1).name('Scale X').onChange(() => this.runDiffuse());
        rubbleFolder.add(settings.rubble.scaleFactor, 'y', 0, 10, 0.1).name('Scale Y').onChange(() => this.runDiffuse());
        rubbleFolder.add(settings.rubble.scaleFactor, 'z', 0, 10, 0.1).name('Scale Z').onChange(() => this.runDiffuse());
        MixedColorSettings.createGUI(settings.rubble.color, rubbleFolder, 'Color', () => this.runDiffuse());
        
        this._landscape = new ColoringLandscape(settings, textures, device, buffers, meshs, displacementMap);
        this._sceneElements.push(this._landscape);
    }

    public override animate(delta: number): void {
        this._landscape.animate(delta);
    }

    private async runDiffuse(): Promise<void> {
        this.changed = true;
        await this._landscape.runDiffuse();
    }
}
