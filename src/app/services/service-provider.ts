import { Scene } from 'three';
import { BufferService } from './buffer-service';
import { SettingsService } from './settings-service';
import { EditStageService } from './edit-stage-service';
import { TextureService } from './texture-service';
import { MeshService } from './mesh-service';
import { GUIService } from './gui-service';

export interface IServiceProvider {
    readonly buffers: BufferService;
    readonly device: GPUDevice;
    readonly meshs: MeshService;
    readonly scene: Scene;
    readonly settings: SettingsService;
    readonly stages: EditStageService;
    readonly textures: TextureService;
    readonly gui: GUIService;
}