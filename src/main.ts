import { MeshManager } from './app/classes/gpu-resources/mesh-manager';
import { LandEditor } from './app/classes/land-editor';

export class Program {

    private readonly _meshs: MeshManager;

    private _editor?: LandEditor;

    constructor() {
        this._meshs = new MeshManager();
        window.addEventListener('unload', () => {
            this._editor?.dispose();
            this._meshs.dispose();
        }, { once: true });
    }

    public async main(): Promise<void> {
        const errorDiv = document.getElementById('compatibility-check') as HTMLDivElement;;
        const errorLabel = document.getElementById('compatibility-check-reason') as HTMLHeadingElement;
        const display = document.getElementById('display') as HTMLCanvasElement;

        if (!navigator.gpu) {
            errorLabel.innerText = 'Your browser doesn\'t support WebGPU';
            display.hidden = true;
            return;
        }

        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (adapter === null) {
            errorLabel.innerText = 'Found no appropriate GPU adapter';
            display.hidden = true;
            return;
        }        
        errorDiv.hidden = true;

        adapter.features.forEach((key, value) => console.debug(`${key}: ${value}`));

        const device = await adapter.requestDevice({ requiredFeatures: ['float32-filterable'] });
        device.lost.then((info) => console.error(info));
        console.debug(device.limits);

        await this._meshs.loadAsync();

        this._editor = new LandEditor(display, device, this._meshs);
        await this._editor.run();
    }
}

new Program().main();