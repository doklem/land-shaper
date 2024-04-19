import { EditStageBase } from './edit-stage-base';
import { MixedColorSettings } from '../settings/mixed-color-settings';
import { ColoringLandscape } from '../objects-3d/landscapes/coloring-landscape';
import { IServiceProvider } from '../services/service-provider';
import { GUI } from 'lil-gui';
import { IDisplacementSource } from '../objects-3d/terrains/displacement-source';
export class ColoringStage extends EditStageBase<ColoringLandscape> {

    protected readonly _landscape: ColoringLandscape;

    public readonly helpPageName = 'Coloring-Stage';

    constructor(
        serviceProvider: IServiceProvider,
        displacement: IDisplacementSource) {
        super(serviceProvider);
        
        this._landscape = new ColoringLandscape(serviceProvider, displacement);
        this._sceneElements.push(this._landscape);
    }

    public override addGUI(parent: GUI): void {
        const diffuse = this._serviceProvider.settings.diffuse;
        const bumps = this._serviceProvider.settings.bumps;
        const rubble = this._serviceProvider.settings.rubble;
        
        const diffuseFolder = parent.addFolder('Surface Definition').hide();
        this._folders.push(diffuseFolder);
        diffuseFolder.add(diffuse, 'slopStart', 0, 1, 0.001).name('Slop Angle').onFinishChange(() => this.runSurface());
        diffuseFolder.add(diffuse, 'slopRange', 0, 10, 0.01).name('Slop Gradient').onFinishChange(() => this.runSurface());
        diffuseFolder.add(diffuse, 'riverStart', 0, 100, 0.1).name('River Start').onFinishChange(() => this.runSurface());
        diffuseFolder.add(diffuse, 'riverRange', 0, 100, 0.1).name('River Gradient').onFinishChange(() => this.runSurface());
        diffuseFolder.add(diffuse, 'shoreStart', -100, 100, 0.1).name('Shore Start Height').onFinishChange(() => this.runSurface());
        diffuseFolder.add(diffuse, 'shoreRange', 0, 200, 0.1).name('Shore Gradient').onFinishChange(() => this.runSurface());
        diffuseFolder.add(diffuse, 'sedimentStart', -10, 10, 0.1).name('Sediment Start').onFinishChange(() => this.runSurface());
        diffuseFolder.add(diffuse, 'sedimentRange', 0, 20, 0.1).name('Sediment Gradient').onFinishChange(() => this.runSurface());

        const bedrockFolder = parent.addFolder('Bedrock Colors').close().hide();
        this._folders.push(bedrockFolder);
        const bedrockFlatFolder = bedrockFolder.addFolder('Flat Terrain').close().hide();
        this._folders.push(bedrockFlatFolder);
        MixedColorSettings.createGUI(diffuse.bedrockFlatNoRiverNoLake, bedrockFlatFolder, 'Dry', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.bedrockFlatNoRiverLake, bedrockFlatFolder, 'Ocean', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.bedrockFlatRiverNoLake, bedrockFlatFolder, 'River', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.bedrockFlatRiverLake, bedrockFlatFolder, 'River And Ocean', () => this.runDiffuse(), true);
        const bedrockSlopeFolder = bedrockFolder.addFolder('Sloped Terrain').close().hide();
        this._folders.push(bedrockSlopeFolder);
        MixedColorSettings.createGUI(diffuse.bedrockSlopeNoRiverNoLake, bedrockSlopeFolder, 'Dry', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.bedrockSlopeNoRiverLake, bedrockSlopeFolder, 'Ocean', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.bedrockSlopeRiverNoLake, bedrockSlopeFolder, 'River', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.bedrockSlopeRiverLake, bedrockSlopeFolder, 'River And Ocean', () => this.runDiffuse(), true);

        const sedimentFolder = parent.addFolder('Sediment Colors').close().hide();
        this._folders.push(sedimentFolder);
        const sedimentFlatFolder = sedimentFolder.addFolder('Flat Terrain').close().hide();
        this._folders.push(sedimentFlatFolder);
        MixedColorSettings.createGUI(diffuse.sedimentFlatNoRiverNoLake, sedimentFlatFolder, 'Dry', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.sedimentFlatNoRiverLake, sedimentFlatFolder, 'Ocean', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.sedimentFlatRiverNoLake, sedimentFlatFolder, 'River', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.sedimentFlatRiverLake, sedimentFlatFolder, 'River And Ocean', () => this.runDiffuse(), true);
        const sedimentSlopeFolder = sedimentFolder.addFolder('Sloped Terrain').close().hide();
        this._folders.push(sedimentSlopeFolder);
        MixedColorSettings.createGUI(diffuse.sedimentSlopeNoRiverNoLake, sedimentSlopeFolder, 'Dry', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.sedimentSlopeNoRiverLake, sedimentSlopeFolder, 'Ocean', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.sedimentSlopeRiverNoLake, sedimentSlopeFolder, 'River', () => this.runDiffuse(), true);
        MixedColorSettings.createGUI(diffuse.sedimentSlopeRiverLake, sedimentSlopeFolder, 'River And Ocean', () => this.runDiffuse(), true);

        const bumpsFolder = parent.addFolder('Bumps').close().hide();
        this._folders.push(bumpsFolder);
        bumpsFolder.add(bumps, 'seed', -10, 10, 0.1).name('Seed').onFinishChange(() => this.runBumps());
        bumpsFolder.add(bumps, 'octaves', 1, 15, 1).name('Octaves').onFinishChange(() => this.runBumps());
        bumpsFolder.add(bumps, 'amplitude', 0, 0.1, 0.01).name('Amplitude').onFinishChange(() => this.runBumps());
        bumpsFolder.add(bumps.scale, 'x', 0, 1000, 1).name('Scale X').onFinishChange(() => this.runBumps());
        bumpsFolder.add(bumps.scale, 'y', 0, 1000, 1).name('Scale Y').onFinishChange(() => this.runBumps());

        const rubbleFolder = parent.addFolder('Rubble').close().hide();
        this._folders.push(rubbleFolder);
        rubbleFolder.add(rubble, 'slopStart', 0, 1, 0.001).name('Slop Angle').onFinishChange(() => this.runRubble());
        rubbleFolder.add(rubble, 'slopRange', 0, 10, 0.01).name('Slop Gradient').onFinishChange(() => this.runRubble());
        rubbleFolder.add(rubble.scale, 'x', 0, 10, 0.1).name('Scale X').onFinishChange(() => this.runRubble());
        rubbleFolder.add(rubble.scale, 'y', 0, 10, 0.1).name('Scale Y').onFinishChange(() => this.runRubble());
        rubbleFolder.add(rubble.scale, 'z', 0, 10, 0.1).name('Scale Z').onFinishChange(() => this.runRubble());
        MixedColorSettings.createGUI(rubble.color, rubbleFolder, 'Color', () => this.runRubble(), true);
    }

    public override animate(delta: number): void {
        this._landscape.animate(delta);
    }

    private async runBumps(): Promise<void> {
        if (!this._visible) {
            return;
        }
        this.changed = true;
        await this._landscape.runBumps();
    }

    private async runDiffuse(): Promise<void> {
        if (!this._visible) {
            return;
        }
        this.changed = true;
        await this._landscape.runDiffuse();
    }

    private async runRubble(): Promise<void> {
        if (!this._visible) {
            return;
        }
        this.changed = true;
        await this._landscape.runRubble();
    }

    private async runSurface(): Promise<void> {
        if (!this._visible) {
            return;
        }
        this.changed = true;
        await this._landscape.runSurface();
    }
}
