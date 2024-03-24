import { Color, Vector2 } from 'three';
import GUI, { Controller } from 'lil-gui';

export class MixedColorSettings {

    public static readonly BYTE_LENGTH = Float32Array.BYTES_PER_ELEMENT * 14
        + Int32Array.BYTES_PER_ELEMENT
        + Float32Array.BYTES_PER_ELEMENT; // Byte pading

    constructor(
        public colorA: Color,
        public colorB: Color,
        public seed: number,
        public octaves: number,
        public start: number,
        public range: number,
        public scale: Vector2) {
    }

    public static createGUI(settings: MixedColorSettings, gui: GUI, name: string, applyChange: () => Promise<void>): Controller[] {
        const mixedColorFolder = gui.addFolder(name).close();
        const controllers = [
            mixedColorFolder.addColor(settings, 'colorA').name('Color A').onChange(() => applyChange()),
            mixedColorFolder.addColor(settings, 'colorB').name('Color B').onChange(() => applyChange()),
            mixedColorFolder.add(settings, 'seed', -10, 10, 0.1).name('Seed').onChange(() => applyChange()),
            mixedColorFolder.add(settings, 'octaves', 1, 15, 1).name('Octaves').onChange(() => applyChange()),
            mixedColorFolder.add(settings, 'start', -2, 2, 0.01).name('Start').onChange(() => applyChange()),
            mixedColorFolder.add(settings, 'range', 0, 10, 0.1).name('Range').onChange(() => applyChange()),
            mixedColorFolder.add(settings.scale, 'x', 0, 1000, 1).name('Scale X').onChange(() => applyChange()),
            mixedColorFolder.add(settings.scale, 'y', 0, 1000, 1).name('Scale Y').onChange(() => applyChange())
        ];
        return controllers;
    }

    public serialize(view: DataView, offset: number, littleEndian: boolean): number {
        offset = MixedColorSettings.serializeColor(this.colorA, view, offset, littleEndian);

        offset = MixedColorSettings.serializeColor(this.colorB, view, offset, littleEndian);

        view.setFloat32(offset, this.seed, littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setInt32(offset, this.octaves, littleEndian);
        offset += Int32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this.start, littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this.range, littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;

        view.setFloat32(offset, this.scale.x, littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this.scale.y, littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, this.scale.y, littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        return offset + Float32Array.BYTES_PER_ELEMENT; // Add WebGPU byte padding.
    }

    public static serializeColor(color: Color, view: DataView, offset: number, littleEndian: boolean): number {
        view.setFloat32(offset, color.r, littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, color.g, littleEndian);
        offset += Float32Array.BYTES_PER_ELEMENT;
        view.setFloat32(offset, color.b, littleEndian);
        return offset + Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT; // Move two because of the alpha channel
    }
}