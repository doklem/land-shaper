import { Controller, GUI } from 'lil-gui';
import { IDisposable } from '../disposable';
import { SettingsIOHelper } from '../settings/settings-io-helper';
import { TemplateType } from '../settings/template-type';
import { SettingsService } from './settings-service';
import { EditStageService } from './edit-stage-service';
import { SkyBox } from '../objects-3d/sky-box';

export class GUIService implements IDisposable {

    private static readonly SOURCE_URL = 'https://github.com/doklem/land-shaper';
    private static readonly HELP_BASE_URL = `${GUIService.SOURCE_URL}/wiki`;

    private readonly _aboutFolder: GUI;
    private readonly _editFolder: GUI;
    private readonly _fileFolder: GUI;
    private readonly _gui: GUI;
    private readonly _nextButton: Controller;
    private readonly _previousButton: Controller;
    private readonly _settingsActions = {
        acknowledgements: () => window.open(`${GUIService.SOURCE_URL}?tab=readme-ov-file#acknowledgements`, '_blank'),
        help: () => window.open(`${GUIService.HELP_BASE_URL}/${this._stages.helpPageName}`, '_blank'),
        license: () => window.open(`${GUIService.SOURCE_URL}?tab=MIT-1-ov-file`, '_blank'),
        load: async () => await this.loadSettings(),
        next: async () => await this.nextStage(),
        previous: async () => await this.previousStage(),
        save: async () => await SettingsIOHelper.save(this._editFolder),
        source: () => window.open(GUIService.SOURCE_URL, '_blank'),
    };
    private readonly _templateButton: Controller;

    private _template: TemplateType;

    constructor(
        private readonly _settings: SettingsService,
        private readonly _stages: EditStageService,
        private readonly _skyBox: SkyBox
    ) {
        this._template = TemplateType.unknown;
        this._gui = new GUI(
            {
                title: 'Land Shaper',
                width: Math.min(600, Math.max(Math.round(window.innerWidth * 0.3), 300)),
            }
        );
        const fileFolderResult = this.addFileFolder();
        this._fileFolder = fileFolderResult.folder;
        this._templateButton = fileFolderResult.button;
        this._editFolder = this._gui.addFolder('Edit');
        this._previousButton = this._editFolder.add(this._settingsActions, 'previous').name('Previous').disable();
        this._nextButton = this._editFolder.add(this._settingsActions, 'next').name('Next');
        this._stages.addGUI(this._editFolder);
        this.addWorldFolder(this._editFolder);
        this.addDebugFolder();
        this._aboutFolder = this.addAboutFolder();
    }
    
    public dispose(): void {
        this._gui.destroy();
    }

    private addAboutFolder(): GUI {
        const folder = this._gui.addFolder('About').close();
        folder.add(this._settingsActions, 'help').name('Help');
        folder.add(this._settingsActions, 'license').name('License');
        folder.add(this._settingsActions, 'acknowledgements').name('Acknowledgements');
        folder.add(this._settingsActions, 'source').name('Source');
        return folder;
    }

    private addDebugFolder(): void {
        const folder = this._gui.addFolder('Debug').close();
        folder.add(this._settings.debug, 'wireframe').name('Wireframe').onChange(() => this._stages.applyDebugSettings());
    }

    private addFileFolder(): { folder: GUI, button: Controller } {
        const folder = this._gui.addFolder('File').close();
        folder.add(this._settingsActions, 'save').name('Save');
        folder.add(this._settingsActions, 'load').name('Load');
        const button = folder.add(
            this,
            '_template',
            {
                '-': TemplateType.unknown,
                Desert: TemplateType.desert,
                Temperate: TemplateType.temperate
            })
            .name('Load Template').onChange(() => this.loadTemplate());
        return { folder, button };
    }

    private addWorldFolder(editFolder: GUI): void {
        const folder = editFolder.addFolder('World').close();

        const skyFolder = folder.addFolder('Sky').close();
        skyFolder.add(this._settings.light, 'elevation', 0, 90, 1).name('Elevation').onChange(() => this.updateWorld());
        skyFolder.add(this._settings.light, 'azimuth', 0, 360, 1).name('Azimuth').onChange(() => this.updateWorld());
        skyFolder.add(this._settings.sky, 'turbidity', 0, 100, 0.1).name('Turbidity').onChange(() => this.updateWorld());
        skyFolder.add(this._settings.sky, 'rayleigh', 0, 50, 0.1).name('Rayleigh').onChange(() => this.updateWorld());
        skyFolder.addColor(this._settings.light, 'ambient').name('Ambient').onChange(() => this.updateWorld());
        skyFolder.addColor(this._settings.light, 'directional').name('Directional').onChange(() => this.updateWorld());

        const waterFolder = folder.addFolder('Water').close();
        waterFolder.add(this._settings.ocean, 'distortionScale', 0, 8, 0.1).name('Distortion Scale').onChange(() => this.updateWorld());
        waterFolder.add(this._settings.ocean, 'waterSize', 0.1, 10, 0.1).name('Size').onChange(() => this.updateWorld());
        waterFolder.add(this._settings.ocean, 'waterSpeed', 0.0001, 0.01, 0.0001).name('Speed').onChange(() => this.updateWorld());
        waterFolder.addColor(this._settings.ocean, 'color').name('Color').onChange(() => this.updateWorld());
    }

    private async nextStage(): Promise<void> {
        this._fileFolder.controllersRecursive().forEach(controller => controller.disable());
        this._nextButton.disable();
        this._previousButton.disable();
        await this._stages.nextStage();
        if (!this._stages.first) {
            this._previousButton.enable();
        }
        if (!this._stages.last) {
            this._nextButton.enable();
        }
        this._fileFolder.controllersRecursive().forEach(controller => controller.enable());
    }

    private async loadSettings(): Promise<void> {
        const settings = await SettingsIOHelper.load();
        if (settings) {
            await this.restart(settings);
        }
    }

    private async loadTemplate(): Promise<void> {
        const settings = await SettingsIOHelper.loadTemplate(this._template);
        if (settings) {
            await this.restart(settings);
            this._template = TemplateType.unknown;
            this._templateButton.updateDisplay();
        }
    }

    private async previousStage(): Promise<void> {
        this._stages.previousStage();
        if (!this._stages.last) {
            this._nextButton.enable();
        }
        if (this._stages.first) {
            this._previousButton.disable();
        }
    }

    private async restart(settings: any): Promise<void> {
        this.setState(false);
        this._stages.hideAll();
        this._editFolder.load(settings, true);
        this._settings.calculateSettings();
        await this._stages.initialize();
        this.updateWorld();
        this._stages.applyDebugSettings();
        this.setState(true);
        this._previousButton.disable();
    }

    private setState(state: boolean) {
        if (state) {
            this._gui.controllersRecursive().forEach(controller => controller.enable());
        } else {
            this._gui.controllersRecursive().forEach(controller => {
                if (controller.parent !== this._aboutFolder) {
                    controller.disable();
                }
            });
        }
    }

    private updateWorld(): void {
        this._stages.applyWaterSettings();
        this._skyBox.update();
    }
}