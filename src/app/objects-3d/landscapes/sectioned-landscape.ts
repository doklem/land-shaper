import { Group, Object3D, Vector2 } from 'three';
import { Terrain } from '../terrain';
import { ILandscape } from './landscape';
import { DiffuseRenderNode } from '../../nodes/render-nodes/diffuse-render-node';
import { ExportableDivideRenderNode } from '../../nodes/render-nodes/exportable-divide-render-node';
import { NormalObjectSpaceRenderNode } from '../../nodes/render-nodes/normal-object-space-render-node';
import { NormalTangentSpaceRenderNode } from '../../nodes/render-nodes/normal-tangent-space-render-node';
import { SurfaceRenderNode } from '../../nodes/render-nodes/surface-render-node';
import { RubbleComputeNode } from '../../nodes/compute-nodes/rubbel-compute-node';
import { Rubble } from '../rubble';
import { Ocean } from '../ocean';
import { IServiceProvider } from '../../services/service-provider';
import { DisplacementRangeComputeNode } from '../../nodes/compute-nodes/displacement-range-compute-node';
import { DisplacementRadiusComputeNode } from '../../nodes/compute-nodes/displacement-radius-compute-node';

export class SectionedLandscape extends Group implements ILandscape {

    private readonly _displacementRadiusComputeNode: DisplacementRadiusComputeNode;
    private readonly _displacementRangeComputeNode: DisplacementRangeComputeNode;
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

    constructor(private readonly _serviceProvider: IServiceProvider) {
        super();

        this._running = false;
        this.applyMatrix4(_serviceProvider.settings.constants.transformation);
        this._rubbles = new Map<string, Rubble>();

        const displacementSectionSize = new Vector2(_serviceProvider.textures.displacementSection.width, _serviceProvider.textures.displacementSection.height);
        const totalPixelsSize = new Vector2(1, 1).divide(_serviceProvider.settings.constants.sections.uvRange).multiply(displacementSectionSize);
        const singlePixelUvSize = new Vector2(1, 1).divide(totalPixelsSize);
        const uvRangeInclusive = _serviceProvider.settings.constants.sections.uvRange.clone().add(singlePixelUvSize);
        const meshSizeSection = _serviceProvider.settings.constants.meshSize.clone().multiply(_serviceProvider.settings.constants.sections.uvRange);

        this._displacementRenderNode = new ExportableDivideRenderNode(
            _serviceProvider,
            uvRangeInclusive,
            _serviceProvider.textures.displacementErosion,
            _serviceProvider.textures.displacementSection);
        this._displacementRangeComputeNode = new DisplacementRangeComputeNode(
            _serviceProvider,
            _serviceProvider.textures.displacementSection
        );
        this._displacementRadiusComputeNode = new DisplacementRadiusComputeNode(
            _serviceProvider,
            _serviceProvider.textures.displacementSection,
            meshSizeSection,
            this._displacementRangeComputeNode.minBuffer,
            this._displacementRangeComputeNode.maxBuffer
        );
        this._normalObjectSpaceRenderNode = new NormalObjectSpaceRenderNode(
            _serviceProvider,
            _serviceProvider.settings.constants.sections.uvRange,
            _serviceProvider.textures.displacementErosion,
            _serviceProvider.textures.normalObjectSpaceSection);
        this._normalTangentSpaceRenderNode = new NormalTangentSpaceRenderNode(
            _serviceProvider,
            _serviceProvider.textures.normalObjectSpaceSection,
            _serviceProvider.textures.normalTangentSpaceSection);
        this._surfaceRenderNode = new SurfaceRenderNode(
            _serviceProvider,
            _serviceProvider.settings.constants.sections.uvRange,
            _serviceProvider.textures.normalObjectSpaceSection,
            _serviceProvider.textures.displacementErosion,
            _serviceProvider.textures.water,
            _serviceProvider.textures.surfaceSection);
        this._diffuseRenderNode = new DiffuseRenderNode(
            _serviceProvider,
            _serviceProvider.settings.constants.sections.uvRange,
            _serviceProvider.textures.surfaceSection,
            _serviceProvider.textures.displacementErosion,
            _serviceProvider.textures.diffuseSection);
        this._rubbleComputeNode = new RubbleComputeNode(
            _serviceProvider,
            _serviceProvider.settings.constants.sections.uvRange,
            _serviceProvider.textures.rubbleTextureSection);

        this._terrains = new Map<string, Terrain>();
        const meshSectionOffsetTerrain = meshSizeSection.clone().multiplyScalar(0.5);
        const meshSectionOffsetRubble = new Vector2();
        for (let y = 0; y < 1; y += _serviceProvider.settings.constants.sections.uvRange.y) {
            for (let x = 0; x < 1; x += _serviceProvider.settings.constants.sections.uvRange.x) {
                const uvOffset = new Vector2(x, y);
                const uvOffsetKey = SectionedLandscape.uvOffsetToKey(uvOffset);

                const terrain = new Terrain(
                    _serviceProvider,
                    meshSizeSection,
                    _serviceProvider.settings.constants.sections.vertexSizeMaximum,
                    _serviceProvider.settings.constants.vertexSizeFinalMinimum,
                    _serviceProvider.settings.constants.meshLodDistance * 0.5,
                    false,
                    this._normalTangentSpaceRenderNode,
                    this._diffuseRenderNode,
                    this._displacementRenderNode.textureSettings);
                SectionedLandscape.translateSection(_serviceProvider.settings.constants.meshSize, terrain, uvOffset, meshSectionOffsetTerrain);
                this._terrains.set(uvOffsetKey, terrain);
                this.add(terrain);

                const rubble = new Rubble(_serviceProvider, _serviceProvider.settings.constants.meshLodDistance * 0.5, this._rubbleComputeNode);
                SectionedLandscape.translateSection(_serviceProvider.settings.constants.meshSize, rubble, uvOffset, meshSectionOffsetRubble);
                this._rubbles.set(uvOffsetKey, rubble);
                this.add(rubble);
            }
        }

        this._ocean = new Ocean(_serviceProvider);
        this.add(this._ocean);
    }

    public animate(delta: number): void {
        this._ocean.animate(delta);
    }

    public applyDebugSettings(): void {
        this._terrains.forEach(terrain => terrain.applyDebugSettings());
        this._ocean.applyDebugSettings();
    }

    public applyWaterSettings(): void {
        this._ocean.applySettings();
    }

    public dispose(): void {
        this._terrains.forEach(terrain => terrain.dispose());
        this._rubbles.forEach(rubble => rubble.dispose());
        this._displacementRadiusComputeNode.dispose();
        this._displacementRangeComputeNode.dispose();
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
        object3D.position.set(translation.x, translation.y, 0);
    }

    public async runLandscape(): Promise<void> {
        if (this._running) {
            return;
        }
        this._running = true;

        for (let y = 0; y < 1; y += this._serviceProvider.settings.constants.sections.uvRange.y) {
            for (let x = 0; x < 1; x += this._serviceProvider.settings.constants.sections.uvRange.x) {
                const uvOffset = new Vector2(x, y);

                this._displacementRenderNode.configureRun(uvOffset);
                this._displacementRangeComputeNode.configureRun();
                this._normalObjectSpaceRenderNode.configureRun(uvOffset);
                this._surfaceRenderNode.configureRun(uvOffset);
                this._diffuseRenderNode.configureRun(uvOffset);
                this._rubbleComputeNode.configureRun(uvOffset);

                const commandEncoder = this._serviceProvider.device.createCommandEncoder();
                this._displacementRenderNode.appendRenderPass(commandEncoder);
                this._displacementRangeComputeNode.appendComputePass(commandEncoder);
                this._displacementRadiusComputeNode.appendComputePass(commandEncoder);
                this._normalObjectSpaceRenderNode.appendRenderPass(commandEncoder);
                this._normalTangentSpaceRenderNode.appendRenderPass(commandEncoder);
                this._surfaceRenderNode.appendRenderPass(commandEncoder);
                this._diffuseRenderNode.appendRenderPass(commandEncoder);
                this._rubbleComputeNode.appendComputePass(commandEncoder);
                this._serviceProvider.device.queue.submit([commandEncoder.finish()]);

                const uvOffsetKey = SectionedLandscape.uvOffsetToKey(uvOffset);
                const promises: Promise<void>[] = [
                    this._terrains.get(uvOffsetKey)!.applyRunOutput({
                        displacement: this._displacementRenderNode,
                        range: this._displacementRangeComputeNode,
                        radius: this._displacementRadiusComputeNode
                    }),
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