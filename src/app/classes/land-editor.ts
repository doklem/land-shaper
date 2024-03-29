import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { BufferService } from './services/buffer-service';
import { TextureService } from './services/texture-service';
import { SkyBox } from './objects-3d/sky-box';
import { IDisposable } from './disposable';
import { MeshService } from './services/mesh-service';
import { SettingsService } from './services/settings-service';
import { EditStageService } from './services/edit-stage-service';
import { IServiceProvider } from './services/service-provider';
import { GUIService } from './services/gui-service';

export class LandEditor implements IDisposable, IServiceProvider {

    private readonly _camera: PerspectiveCamera;
    private readonly _controls: MapControls;
    private readonly _renderer: WebGLRenderer;
    private readonly _skyBox: SkyBox;

    private _lastRun: DOMHighResTimeStamp;
    
    public readonly buffers: BufferService;
    public readonly scene: Scene;
    public readonly settings: SettingsService;
    public readonly stages: EditStageService;
    public readonly textures: TextureService;
    public readonly gui: GUIService;

    public constructor(
        private readonly _canvas: HTMLCanvasElement,
        public readonly device: GPUDevice,
        public readonly meshs: MeshService) {
        this._lastRun = 0;

        _canvas.width = window.innerWidth;
        _canvas.height = window.innerHeight;

        this._renderer = new WebGLRenderer({
            canvas: this._canvas,
            antialias: true,
        });
        this._renderer.toneMapping = ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 0.5;
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth, window.innerHeight);

        this._camera = new PerspectiveCamera(50, _canvas.width / _canvas.height, 0.1, 5000);
        this._camera.position.set(0, 200, 0);
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();

        this.scene = new Scene();

        this.settings = new SettingsService(this._renderer.capabilities.getMaxAnisotropy());
        this.textures = new TextureService(this.settings, device);
        this.buffers = new BufferService(device);
        this.stages = new EditStageService(this);

        this._skyBox = new SkyBox(this);
        this.scene.add(this._skyBox);

        this.gui = new GUIService(this.settings, this.stages, this._skyBox);

        this._controls = new MapControls(this._camera, this._renderer.domElement);
        this._controls.update();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    public dispose(): void {
        window.removeEventListener('resize', () => this.onWindowResize());
        this._renderer.setAnimationLoop(null);
        this.stages.dispose();
        this.scene.clear();
        this._skyBox.dispose();
        this._renderer.dispose();
        this.buffers.dispose();
        this.textures.dispose();
        this.gui.dispose();
    }

    public async run(): Promise<void> {
        await this.stages.initialize();
        this._renderer.setAnimationLoop((now) => this.animate(now));
    }

    private async animate(now: DOMHighResTimeStamp): Promise<void> {
        const delta = now - this._lastRun;
        this._lastRun = now;
        this.stages.animate(delta);
        this._controls.update();
        this._renderer.render(this.scene, this._camera);
    }

    private onWindowResize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this._canvas.width = width;
        this._canvas.height = height;
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(width, height);
    }
}