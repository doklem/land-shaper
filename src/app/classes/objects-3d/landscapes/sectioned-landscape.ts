import { Group, Object3D, Vector2 } from 'three';
import { TextureManager } from '../../gpu-resources/texture-manager';
import { BufferManager } from '../../gpu-resources/buffer-manager';
import { Terrain } from '../terrain';
import { ILandscape } from './landscape';
import { DiffuseRenderNode } from '../../nodes/render-nodes/diffuse-render-node';
import { ExportableDivideRenderNode } from '../../nodes/render-nodes/exportable-divide-render-node';
import { NormalObjectSpaceRenderNode } from '../../nodes/render-nodes/normal-object-space-render-node';
import { NormalTangentSpaceRenderNode } from '../../nodes/render-nodes/normal-tangent-space-render-node';
import { SurfaceRenderNode } from '../../nodes/render-nodes/surface-render-node';
import { RubbleComputeNode } from '../../nodes/compute-nodes/rubbel-compute-node';
import { MeshManager } from '../../gpu-resources/mesh-manager';
import { Rubble } from '../rubble';
import { SettingsManager } from '../../settings/settings-manager';
import { Ocean } from '../ocean';

export class SectionedLandscape extends Group implements ILandscape {

    private readonly _diffuseRenderNode: DiffuseRenderNode;
    private readonly _displacementRenderNode: ExportableDivideRenderNode;
    private readonly _normalObjectSpaceRenderNode: NormalObjectSpaceRenderNode;
    private readonly _normalTangentSpaceRenderNode: NormalTangentSpaceRenderNode;
    private readonly _rubbleComputeNode: RubbleComputeNode;
    private readonly _rubbles: Map<string, Rubble>;
    private readonly _ocean: Ocean;
    private readonly _surfaceRenderNode: SurfaceRenderNode;
    private readonly _terrains: Map<string, Terrain>;

    private _running: boolean;

    constructor(
        private readonly _settings: SettingsManager,
        textures: TextureManager,
        private readonly _device: GPUDevice,
        buffers: BufferManager,
        meshs: MeshManager) {
        super();

        this._running = false;
        this.applyMatrix4(_settings.constants.transformation);
        this._rubbles = new Map<string, Rubble>();

        const displacementSectionSize = new Vector2(textures.displacementSection.width, textures.displacementSection.height);
        const totalPixelsSize = new Vector2(1, 1).divide(_settings.constants.sections.uvRange).multiply(displacementSectionSize);
        const singlePixelUvSize = new Vector2(1, 1).divide(totalPixelsSize);
        const uvRangeInclusive = _settings.constants.sections.uvRange.clone().add(singlePixelUvSize);
        const meshSizeSection = _settings.constants.meshSize.clone().multiply(_settings.constants.sections.uvRange);

        this._displacementRenderNode = new ExportableDivideRenderNode(
            _device,
            buffers,
            textures,
            uvRangeInclusive,
            textures.displacementFinal,
            textures.displacementSection);
        this._normalObjectSpaceRenderNode = new NormalObjectSpaceRenderNode(
            _settings,
            _device,
            buffers,
            textures,
            _settings.constants.sections.uvRange,
            textures.displacementFinal,
            textures.normalObjectSpaceSection);
        this._normalTangentSpaceRenderNode = new NormalTangentSpaceRenderNode(
            _device,
            buffers,
            textures,
            textures.normalObjectSpaceSection,
            textures.normalTangentSpaceSection);
        this._surfaceRenderNode = new SurfaceRenderNode(
            _settings,
            _device,
            buffers,
            textures,
            _settings.constants.sections.uvRange,
            textures.normalObjectSpaceSection,
            textures.displacementFinal,
            textures.water,
            textures.surfaceSection);
        this._diffuseRenderNode = new DiffuseRenderNode(
            _settings,
            _device,
            buffers,
            textures,
            _settings.constants.sections.uvRange,
            textures.surfaceSection,
            textures.displacementFinal,
            textures.diffuseSection);
        this._rubbleComputeNode = new RubbleComputeNode(
            _settings,
            textures,
            _device,
            _settings.constants.sections.uvRange,
            textures.rubbleTextureSection);

        this._terrains = new Map<string, Terrain>();
        const meshSectionOffsetTerrain = meshSizeSection.clone().multiplyScalar(0.5);
        const meshSectionOffsetRubble = new Vector2();
        for (let y = 0; y < 1; y += _settings.constants.sections.uvRange.y) {
            for (let x = 0; x < 1; x += _settings.constants.sections.uvRange.x) {
                const uvOffset = new Vector2(x, y);
                const uvOffsetKey = SectionedLandscape.uvOffsetToKey(uvOffset);

                const terrain = new Terrain(
                    _settings,
                    meshSizeSection,
                    _settings.constants.sections.vertexSizeMaximum,
                    _settings.constants.vertexSizeFinalMinimum,
                    _settings.constants.meshLodDistance * 0.5,
                    false,
                    this._normalTangentSpaceRenderNode,
                    this._diffuseRenderNode,
                    this._displacementRenderNode.textureSettings);
                SectionedLandscape.translateSection(_settings.constants.meshSize, terrain, uvOffset, meshSectionOffsetTerrain);
                this._terrains.set(uvOffsetKey, terrain);
                this.add(terrain);
                
                const rubble = new Rubble(meshs, _settings.constants.meshLodDistance * 0.5, this._rubbleComputeNode);
                SectionedLandscape.translateSection(_settings.constants.meshSize, rubble, uvOffset, meshSectionOffsetRubble);
                this._rubbles.set(uvOffsetKey, rubble);
                this.add(rubble);
            }
        }

        this._ocean = new Ocean(_settings, meshs);
        this.add(this._ocean);
    }

    public animate(delta: number): void {
        this._ocean.animate(delta);
    }

    public applyDebugSettings(): void {
        this._terrains.forEach(terrain => terrain.applyDebugSettings());
    }

    public applyWaterSettings(): void {
        this._ocean.applySettings();
    }

    public dispose(): void {
        this._terrains.forEach(terrain => terrain.dispose());
        this._rubbles.forEach(rubble => rubble.dispose());
        this._diffuseRenderNode.dispose();
        this._displacementRenderNode.dispose();
        this._normalObjectSpaceRenderNode.dispose();
        this._normalTangentSpaceRenderNode.dispose();
        this._rubbleComputeNode.dispose();
        this._ocean.dispose();
        this._surfaceRenderNode.dispose();
    }

    private static translateSection(meshSize: Vector2, object3D: Object3D, uvOffset: Vector2, meshSectionOffset: Vector2): void {
        const translation = meshSize.clone().multiply(uvOffset)
            .sub(meshSize.clone().multiplyScalar(0.5))
            .add(meshSectionOffset);
        object3D.translateX(translation.x);
        object3D.translateY(translation.y);
    }

    public async runLandscape(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;

        for (let y = 0; y < 1; y += this._settings.constants.sections.uvRange.y) {
            for (let x = 0; x < 1; x += this._settings.constants.sections.uvRange.x) {
                const uvOffset = new Vector2(x, y);
                this._displacementRenderNode.configureRun(uvOffset);
                this._normalObjectSpaceRenderNode.configureRun(uvOffset);
                this._surfaceRenderNode.configureRun(uvOffset);
                this._diffuseRenderNode.configureRun(uvOffset);
                this._rubbleComputeNode.configureRun(uvOffset);
                const commandEncoder = this._device.createCommandEncoder();
                this._displacementRenderNode.appendRenderPass(commandEncoder);
                this._normalObjectSpaceRenderNode.appendRenderPass(commandEncoder);
                this._normalTangentSpaceRenderNode.appendRenderPass(commandEncoder);
                this._surfaceRenderNode.appendRenderPass(commandEncoder);
                this._diffuseRenderNode.appendRenderPass(commandEncoder);
                this._rubbleComputeNode.appendComputePass(commandEncoder);
                this._device.queue.submit([commandEncoder.finish()]);

                const uvOffsetKey = SectionedLandscape.uvOffsetToKey(uvOffset);
                const promises: Promise<void>[] = [
                    this._terrains.get(uvOffsetKey)!.applyRunOutput(this._displacementRenderNode),
                    this._rubbles.get(uvOffsetKey)!.applyRunOutput()
                ];
                await Promise.all(promises);
            }
        }

        this._running = false;
    }

    private static uvOffsetToKey(uvOffset: Vector2): string {
        return `${uvOffset.x},${uvOffset.y}`;
    }
}