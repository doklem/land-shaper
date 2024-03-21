import { MeshManager } from './app/classes/gpu-resources/mesh-manager';
import { LandEditor } from './app/classes/land-editor';

export class Program {

    private readonly _requirements: HTMLDivElement;
    private readonly _content: HTMLDivElement;
    private readonly _display: HTMLCanvasElement;
    private readonly _meshs: MeshManager;

    private _editor?: LandEditor;

    constructor() {
        this._content = document.getElementById('content') as HTMLDivElement;
        this._display = document.getElementById('display') as HTMLCanvasElement;
        this._requirements = document.getElementById('requirements') as HTMLDivElement;
        this._meshs = new MeshManager();
        window.addEventListener('unload', () => {
            this._editor?.dispose();
            this._meshs.dispose();
        }, { once: true });
    }

    public async main(): Promise<void> {
        const device = await Program.getDevice();
        if (!device) {
            this._content.hidden = true;
            this._requirements.hidden = false;
            return;
        }
        device.lost.then((info) => console.error(info));
        await this._meshs.loadAsync();
        this._editor = new LandEditor(this._display, device, this._meshs);
        await this._editor.run();
    }

    private static async getDevice(): Promise<GPUDevice | undefined> {
        if (!navigator.gpu) {
            return;
        }
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (adapter === null) {
            return;
        }
        if (!adapter.features.has('float32-filterable')) {
            return;
        }
        try {
            return await adapter.requestDevice({ requiredFeatures: ['float32-filterable'] });
        } catch (error) {
            console.error(error);
        }
    }
}

new Program().main();