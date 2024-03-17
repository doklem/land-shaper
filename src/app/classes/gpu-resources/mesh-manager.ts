import {
    BufferGeometry,
    DodecahedronGeometry,
    IcosahedronGeometry,
    Mesh,
    MeshStandardMaterial,
    NormalBufferAttributes,
    OctahedronGeometry,
    RepeatWrapping,
    TetrahedronGeometry,
    Texture,
    TextureLoader
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { IDisposable } from '../disposable';
import { TextureManager } from './texture-manager';

export class MeshManager implements IDisposable {

    public readonly rubbleGeometries: BufferGeometry<NormalBufferAttributes>[];

    public rubbleMaterial?: MeshStandardMaterial;
    public waterNomrals?: Texture;

    constructor() {
        this.rubbleGeometries = [];
        this.rubbleGeometries.length = 5;
        this.rubbleGeometries[1] = new DodecahedronGeometry();
        this.rubbleGeometries[2] = new IcosahedronGeometry();
        this.rubbleGeometries[3] = new OctahedronGeometry();
        this.rubbleGeometries[4] = new TetrahedronGeometry();
    }

    public async loadAsync(): Promise<void> {
        await Promise.all([
            this.loadRubbleAsync(),
            this.loadWaterAsync(),
        ]);
    }

    public dispose(): void {
        this.rubbleGeometries.forEach(geometry => geometry?.dispose());
        const material = this.rubbleMaterial;
        if (material) {
            TextureManager.disposeMaterialTextures(material);
            material.dispose();
        }
        this.waterNomrals?.dispose();
    }

    private async loadRubbleAsync(): Promise<void> {
        if (this.rubbleMaterial) {
            return;
        }
        const glb = await new GLTFLoader().loadAsync('dist/assets/rock_lowpoly.glb');
        const meshLod0 = (glb.scene.children[0].children[0].children[0].children[0] as Mesh);
        this.rubbleGeometries[0] = meshLod0.geometry;
        this.rubbleMaterial = meshLod0.material as MeshStandardMaterial;
        const rubbleMap = this.rubbleMaterial.map;
        if (rubbleMap) {
            this.rubbleMaterial.map = null;
            this.rubbleMaterial.needsUpdate = true;
            rubbleMap.dispose();
        }
        this.rubbleGeometries.forEach(geometry => {
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
        });
    }

    private async loadWaterAsync(): Promise<void> {
        this.waterNomrals = await new TextureLoader().loadAsync('dist/assets/waternormals.jpg');
        this.waterNomrals.wrapS = RepeatWrapping;
        this.waterNomrals.wrapT = RepeatWrapping;
    }
}