import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { GUI } from 'lil-gui';
import { BufferManager } from './gpu-resources/buffer-manager';
import { TextureManager } from './gpu-resources/texture-manager';
import { SkyBox } from './objects-3d/sky-box';
import { IDisposable } from './disposable';
import { TopologyStage } from './editor-stages/topology-stage';
import { SettingsManager } from './settings/settings-manager';

export class LandEditor implements IDisposable {

    private readonly _buffers: BufferManager;
    private readonly _camera: PerspectiveCamera;
    private readonly _controls: MapControls;
    private readonly _gui: GUI;
    private readonly _renderer: WebGLRenderer;
    private readonly _scene: Scene;
    private readonly _settings: SettingsManager;
    private readonly _skyBox: SkyBox;
    private readonly _textures: TextureManager;
    private readonly _topologyStage: TopologyStage;

    public constructor(
        private readonly _canvas: HTMLCanvasElement,
        device: GPUDevice) {
        _canvas.width = window.innerWidth;
        _canvas.height = window.innerHeight;
        this._camera = new PerspectiveCamera(50, _canvas.width / _canvas.height, 0.1, 5000);
        this._camera.position.set(0, 200, 0);

        this._renderer = new WebGLRenderer({
            canvas: this._canvas,
            antialias: true,
        });
        this._renderer.toneMapping = ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 0.5;
        this._renderer.setPixelRatio(window.devicePixelRatio);

        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(window.innerWidth, window.innerHeight);

        this._settings = new SettingsManager(this._renderer.capabilities.getMaxAnisotropy());
        this._textures = new TextureManager(this._settings, device);
        this._buffers = new BufferManager(device);

        this._scene = new Scene();
        this._skyBox = new SkyBox(this._settings);
        this._scene.add(this._skyBox);

        this._controls = new MapControls(this._camera, this._renderer.domElement);
        this._controls.update();

        this._gui = new GUI({ width: 700 });

        this._topologyStage = new TopologyStage(this._settings, this._scene, this._gui, this._textures, device, this._buffers);

        const worldFolder = this._gui.addFolder('World').close();
        const skyFolder = worldFolder.addFolder('Sky').close();
        skyFolder.add(this._settings.light, 'elevation', 0, 90, 1).name('Elevation').onChange(() => this.updateWorld());
        skyFolder.add(this._settings.light, 'azimuth', 0, 360, 1).name('Azimuth').onChange(() => this.updateWorld());
        skyFolder.add(this._settings.sky, 'turbidity', 0, 100, 0.1).name('Turbidity').onChange(() => this.updateWorld());
        skyFolder.add(this._settings.sky, 'rayleigh', 0, 50, 0.1).name('Rayleigh').onChange(() => this.updateWorld());
        skyFolder.addColor(this._settings.light, 'ambient').name('Ambient').onChange(() => this.updateWorld());
        skyFolder.addColor(this._settings.light, 'directional').name('Directional').onChange(() => this.updateWorld());

        const waterFolder = worldFolder.addFolder('Water').close();
        waterFolder.addColor(this._settings.ocean, 'color').name('Color').onChange(() => this.updateWorld());

        const debugFolder = this._gui.addFolder('Debug').close();
        debugFolder.add(this._settings.debug, 'wireframe').name('Wireframe').onChange(() => this.applyDebugSettings());

        window.addEventListener('resize', () => this.onWindowResize());

        this._topologyStage.enable();
    }
    
    public dispose(): void {
        window.removeEventListener('resize', () => this.onWindowResize());
        this._renderer.setAnimationLoop(null);
        this._topologyStage.dispose();
        this._scene.clear();
        this._skyBox.dispose();
        this._renderer.dispose();
        this._buffers.dispose();
        this._textures.dispose();
    }

    public async run(): Promise<void> {
        await this._topologyStage.updateLandscape();
        this._renderer.setAnimationLoop((now) => this.animate(now));
    }

    private updateWorld(): void {
        this._topologyStage.applyWaterSettings();
        this._skyBox.update();
    }

    private applyDebugSettings(): void {
        this._topologyStage.applyDebugSettings();
    }

    private onWindowResize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this._canvas.width = width;
        this._canvas.height = height;
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        this._renderer?.setSize(width, height);
    }

    private async animate(now: DOMHighResTimeStamp): Promise<void> {
        this._controls.update();
        this._renderer.render(this._scene, this._camera);
    }
}