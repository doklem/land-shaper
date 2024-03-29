import { DataTexture } from 'three';
import { EditStageBase } from './edit-stage-base';
import { MixedColorSettings } from '../settings/mixed-color-settings';
import { ColoringLandscape } from '../objects-3d/landscapes/coloring-landscape';
import { IServiceProvider } from '../services/service-provider';
import { GUI } from 'lil-gui';
export class ColoringStage extends EditStageBase<ColoringLandscape> {

    protected readonly _landscape: ColoringLandscape;

    public readonly helpPageName = 'Coloring-Stage';

    constructor(serviceProvider: IServiceProvider, displacementMap: DataTexture) {
        super(serviceProvider);
        
        this._landscape = new ColoringLandscape(serviceProvider, displacementMap);
        this._sceneElements.push(this._landscape);
    }

    public override addGUI(parent: GUI): void {
        const diffuse = this._serviceProvider.settings.diffuse;
        const normals = this._serviceProvider.settings.normals;
        const rubble = this._serviceProvider.settings.rubble;
        
        const diffuseFolder = parent.addFolder('Colors').hide();
        this._folders.push(diffuseFolder);
        diffuseFolder.add(diffuse, 'slopStart', 0, 1, 0.001).name('Slop Angle').onChange(() => this.runDiffuse());
        diffuseFolder.add(diffuse, 'slopRange', 0, 10, 0.01).name('Slop Gradient').onChange(() => this.runDiffuse());
        diffuseFolder.add(diffuse, 'riverStart', 0, 100, 0.1).name('River Start').onChange(() => this.runDiffuse());
        diffuseFolder.add(diffuse, 'riverRange', 0, 100, 0.1).name('River Gradient').onChange(() => this.runDiffuse());
        diffuseFolder.add(diffuse, 'shoreStart', -100, 100, 0.1).name('Shore Start Height').onChange(() => this.runDiffuse());
        diffuseFolder.add(diffuse, 'shoreRange', 0, 200, 0.1).name('Shore Gradient').onChange(() => this.runDiffuse());

        const bumpsFolder = diffuseFolder.addFolder('Normal Bumps').close().hide();
        this._folders.push(bumpsFolder);
        bumpsFolder.add(normals, 'seed', -10, 10, 0.1).name('Seed').onChange(() => this.runDiffuse());
        bumpsFolder.add(normals, 'octaves', 1, 15, 1).name('Octaves').onChange(() => this.runDiffuse());
        bumpsFolder.add(normals, 'amplitude', 0, 0.1, 0.01).name('Amplitude').onChange(() => this.runDiffuse());
        bumpsFolder.add(normals.scale, 'x', 0, 1000, 1).name('Scale X').onChange(() => this.runDiffuse());
        bumpsFolder.add(normals.scale, 'y', 0, 1000, 1).name('Scale Y').onChange(() => this.runDiffuse());

        MixedColorSettings.createGUI(diffuse.vegetation, diffuseFolder, 'Vegetation', () => this.runDiffuse());
        MixedColorSettings.createGUI(diffuse.bedrock, diffuseFolder, 'Bedrock', () => this.runDiffuse());
        MixedColorSettings.createGUI(diffuse.gravel, diffuseFolder, 'Gravel', () => this.runDiffuse());

        const rubbleFolder = diffuseFolder.addFolder('Rubble').close().hide();
        this._folders.push(rubbleFolder);
        rubbleFolder.add(rubble, 'slopStart', 0, 1, 0.001).name('Slop Angle').onChange(() => this.runDiffuse());
        rubbleFolder.add(rubble, 'slopRange', 0, 10, 0.01).name('Slop Gradient').onChange(() => this.runDiffuse());
        rubbleFolder.add(rubble.scaleFactor, 'x', 0, 10, 0.1).name('Scale X').onChange(() => this.runDiffuse());
        rubbleFolder.add(rubble.scaleFactor, 'y', 0, 10, 0.1).name('Scale Y').onChange(() => this.runDiffuse());
        rubbleFolder.add(rubble.scaleFactor, 'z', 0, 10, 0.1).name('Scale Z').onChange(() => this.runDiffuse());
        MixedColorSettings.createGUI(rubble.color, rubbleFolder, 'Color', () => this.runDiffuse());
    }

    public override animate(delta: number): void {
        this._landscape.animate(delta);
    }

    private async runDiffuse(): Promise<void> {
        if (!this._visible) {
            return;
        }
        this.changed = true;
        await this._landscape.runDiffuse();
    }
}
