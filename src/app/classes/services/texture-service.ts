import { DataTexture, FloatType, MeshStandardMaterial, PixelFormat, RedFormat, RGBAFormat, RGFormat, Vector2 } from 'three';
import { IDisposable } from '../disposable';
import { ITextureSettings } from '../settings/texture-settings';
import { TextureWrapper } from './texture-wrapper';
import { NormalTangentSpaceRenderNode } from '../nodes/render-nodes/normal-tangent-space-render-node';
import { NormalObjectSpaceRenderNode } from '../nodes/render-nodes/normal-object-space-render-node';
import { DiffuseRenderNode } from '../nodes/render-nodes/diffuse-render-node';
import { DisplacementRenderNode } from '../nodes/render-nodes/displacement-render-node';
import { WaterComputeNode } from '../nodes/compute-nodes/water-compute-node';
import { Rubble } from '../objects-3d/rubble';
import { SurfaceRenderNode } from '../nodes/render-nodes/surface-render-node';
import { SettingsService } from './settings-service';

export class TextureService implements IDisposable {

    public static readonly R_PIXEL_LENGTH = 1;
    public static readonly RG_PIXEL_LENGTH = 2;
    public static readonly RGBA_PIXEL_LENGTH = 4;

    private static readonly R_FLOAT_PIXEL_BYTE_LENGTH = TextureService.R_PIXEL_LENGTH * Float32Array.BYTES_PER_ELEMENT;
    private static readonly RG_FLOAT_PIXEL_BYTE_LENGTH = TextureService.RG_PIXEL_LENGTH * Float32Array.BYTES_PER_ELEMENT;
    private static readonly RGBA_FLOAT_PIXEL_BYTE_LENGTH = TextureService.RGBA_PIXEL_LENGTH * Float32Array.BYTES_PER_ELEMENT;
    private static readonly FLOAT_SAMPLER_BINDING: GPUSamplerBindingType = 'filtering';
    private static readonly FLOAT_TEXTURE_SAMPLE: GPUTextureSampleType = 'float';

    public readonly displacementDraft: TextureWrapper;
    public readonly displacementFinal: TextureWrapper;
    public readonly displacementFinalCopy: TextureWrapper;
    public readonly displacementSection: TextureWrapper;
    public readonly diffuse: TextureWrapper;
    public readonly diffuseSection: TextureWrapper;
    public readonly floatSampler: GPUSampler;
    public readonly normalObjectSpace: TextureWrapper;
    public readonly normalObjectSpaceSection: TextureWrapper;
    public readonly normalTangentSpace: TextureWrapper;
    public readonly normalTangentSpaceSection: TextureWrapper;
    public readonly rFloatTextureColors: ITextureSettings;
    public readonly rFloatTextureDraft: ITextureSettings;
    public readonly rFloatTextureTerrain: ITextureSettings;
    public readonly rFloatTextureTerrainSection: ITextureSettings;
    public readonly rgFloatTextureColors: ITextureSettings;
    public readonly rgFloatTextureColorsSection: ITextureSettings;
    public readonly rgbaFloatTextureColors: ITextureSettings;
    public readonly rgbaFloatTextureColorsSection: ITextureSettings;
    public readonly rubbleTexture: ITextureSettings;
    public readonly rubbleTextureSection: ITextureSettings;
    public readonly surface: TextureWrapper;
    public readonly surfaceSection: TextureWrapper;
    public readonly water: TextureWrapper;
    
    //public readonly debug: TextureWrapper;

    constructor(settings: SettingsService, device: GPUDevice) {
        this.rFloatTextureColors = TextureService.createTextureSettings(settings.constants.textureSizeColors, 'r32float');
        this.rFloatTextureDraft = TextureService.createTextureSettings(settings.constants.textureSizeDraft, 'r32float');
        this.rFloatTextureTerrain = TextureService.createTextureSettings(settings.constants.textureSizeTerrain, 'r32float');
        this.rFloatTextureTerrainSection = TextureService.createTextureSettings(settings.constants.sections.textureSizeTerrain, 'r32float');
        this.rgFloatTextureColors = TextureService.createTextureSettings(settings.constants.textureSizeColors, 'rg32float');
        this.rgFloatTextureColorsSection = TextureService.createTextureSettings(settings.constants.sections.textureSizeColors, 'rg32float');
        this.rgbaFloatTextureColors = TextureService.createTextureSettings(settings.constants.textureSizeColors, 'rgba32float');
        this.rgbaFloatTextureColorsSection = TextureService.createTextureSettings(settings.constants.sections.textureSizeColors, 'rgba32float');
        this.rubbleTexture = TextureService.createTextureSettings(settings.constants.rubble.dimensions, 'rgba32float', Rubble.ITEM_LENGTH, Rubble.ITEM_BYTE_LENGTH);
        this.rubbleTextureSection = TextureService.createTextureSettings(settings.constants.rubble.dimensionsSection, 'rgba32float', Rubble.ITEM_LENGTH, Rubble.ITEM_BYTE_LENGTH);

        this.floatSampler = device.createSampler({
            label: 'Float Sampler',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            magFilter: 'linear',
            minFilter: 'linear'
        });

        /*this.debug = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING,
            'Debug',
            this.rgbaFloatTextureColors
        );*/

        this.displacementDraft = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            DisplacementRenderNode.NAME_DRAFT,
            this.rFloatTextureDraft
        );
        this.displacementFinal = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
            DisplacementRenderNode.NAME_FINAL,
            this.rFloatTextureTerrain
        );
        this.displacementFinalCopy = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            `${DisplacementRenderNode.NAME_FINAL} Copy`,
            this.displacementFinal.settings
        );
        this.displacementSection = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            `${DisplacementRenderNode.NAME_FINAL} Section`,
            this.rFloatTextureTerrainSection
        );

        this.water = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
            WaterComputeNode.NAME,
            this.displacementFinal.settings
        );

        this.surface = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            SurfaceRenderNode.NAME,
            this.rgFloatTextureColors
        );
        this.surfaceSection = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            `${SurfaceRenderNode.NAME} Section`,
            this.rgFloatTextureColorsSection
        );

        this.diffuse = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            DiffuseRenderNode.NAME,
            this.rgbaFloatTextureColors
        );
        this.diffuseSection = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            `${DiffuseRenderNode.NAME} Section`,
            this.rgbaFloatTextureColorsSection
        );

        this.normalObjectSpace = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            NormalObjectSpaceRenderNode.NAME,
            this.rgbaFloatTextureColors
        );
        this.normalObjectSpaceSection = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            `${NormalObjectSpaceRenderNode.NAME} Section`,
            this.rgbaFloatTextureColorsSection
        );

        this.normalTangentSpace = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            NormalTangentSpaceRenderNode.NAME,
            this.normalObjectSpace.settings
        );
        this.normalTangentSpaceSection = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            `${NormalTangentSpaceRenderNode.NAME} Section`,
            this.rgbaFloatTextureColorsSection
        );
    }

    public dispose(): void {
        this.displacementDraft.dispose();
        this.displacementFinal.dispose();
        this.displacementFinalCopy.dispose();
        this.displacementSection.dispose();
        this.diffuse.dispose();
        this.diffuseSection.dispose();
        this.normalObjectSpace.dispose();
        this.normalObjectSpaceSection.dispose();
        this.normalTangentSpace.dispose();
        this.normalTangentSpaceSection.dispose();
        this.surface.dispose();
        this.surfaceSection.dispose();
        this.water.dispose();
    }

    public static disposeMaterialTextures(material: MeshStandardMaterial): void {
        material.alphaMap?.dispose();
        material.aoMap?.dispose();
        material.bumpMap?.dispose();
        material.displacementMap?.dispose();
        material.emissiveMap?.dispose();
        material.envMap?.dispose();
        material.lightMap?.dispose();
        material.map?.dispose();
        material.metalnessMap?.dispose();
        material.normalMap?.dispose();
        material.roughnessMap?.dispose();
    }

    private static createTextureSettings(
        size: Vector2,
        format: GPUTextureFormat,
        pixelLength?: number,
        pixelByteLength?: number): ITextureSettings {
        if (!pixelLength || !pixelByteLength) {
            switch (format) {
                case 'r32float':
                    pixelLength = TextureService.R_PIXEL_LENGTH;
                    pixelByteLength = TextureService.R_FLOAT_PIXEL_BYTE_LENGTH;
                    break;
                case 'rg32float':
                    pixelLength = TextureService.RG_PIXEL_LENGTH;
                    pixelByteLength = TextureService.RG_FLOAT_PIXEL_BYTE_LENGTH;
                    break;
                case 'rgba32float':
                    pixelLength = TextureService.RGBA_PIXEL_LENGTH;
                    pixelByteLength = TextureService.RGBA_FLOAT_PIXEL_BYTE_LENGTH;
                    break;
                default:
                    throw new Error(`There is no pixel length and pixel byte length defined for the texture format ${format}`);
            }
        }
        
        const pixelCount = size.x * size.y;        
        return {
            width: size.x,
            height: size.y,
            bytesPerRow: size.x * pixelByteLength,
            byteLength: pixelCount * pixelByteLength,
            length: pixelCount * pixelLength,
            samplerBinding: TextureService.FLOAT_SAMPLER_BINDING,
            format
        };
    }

    public static createDataTexture(array: Float32Array, settings: ITextureSettings, anisotropy?: number): DataTexture {
        if (array.length != settings.length) {
            throw new Error(`The given array's size is ${array.length}, but it has to be ${settings.length} to match the given texture settings`);
        }
        let format: PixelFormat;
        switch (settings.format) {
            case 'r32float':
                format = RedFormat;
                break;        
            case 'rg32float':
                format = RGFormat;
                break;
            case 'rgba32float':
                format = RGBAFormat;
                break;
            default:
                throw new Error(`There is no data texture format defined for the given texture settings format ${settings.format}`);
        }
        return new DataTexture(
            array,
            settings.width,
            settings.height,
            format,
            FloatType,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            anisotropy);
    }
}