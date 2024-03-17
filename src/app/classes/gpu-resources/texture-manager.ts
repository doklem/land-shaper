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
import { SettingsManager } from '../settings/settings-manager';

export class TextureManager implements IDisposable {

    public static readonly R_PIXEL_LENGTH = 1;
    public static readonly RG_PIXEL_LENGTH = 2;
    public static readonly RGBA_PIXEL_LENGTH = 4;

    private static readonly R_FLOAT_PIXEL_BYTE_LENGTH = TextureManager.R_PIXEL_LENGTH * Float32Array.BYTES_PER_ELEMENT;
    private static readonly RG_FLOAT_PIXEL_BYTE_LENGTH = TextureManager.RG_PIXEL_LENGTH * Float32Array.BYTES_PER_ELEMENT;
    private static readonly RGBA_FLOAT_PIXEL_BYTE_LENGTH = TextureManager.RGBA_PIXEL_LENGTH * Float32Array.BYTES_PER_ELEMENT;
    private static readonly FLOAT_SAMPLER_BINDING: GPUSamplerBindingType = 'filtering';
    private static readonly FLOAT_TEXTURE_SAMPLE: GPUTextureSampleType = 'float';

    public readonly displacementDraft: TextureWrapper;
    public readonly displacementFinal: TextureWrapper;
    public readonly displacementFinalCopy: TextureWrapper;
    public readonly diffuse: TextureWrapper;
    public readonly floatSampler: GPUSampler;
    public readonly normalObjectSpace: TextureWrapper;
    public readonly normalTangentSpace: TextureWrapper;
    public readonly rFloatTextureColors: ITextureSettings;
    public readonly rFloatTextureDraft: ITextureSettings;
    public readonly rFloatTextureTerrain: ITextureSettings;
    public readonly rgFloatTextureColors: ITextureSettings;
    public readonly rgbaFloatTextureColors: ITextureSettings;
    public readonly rubbleTexture: ITextureSettings;
    public readonly surface: TextureWrapper;
    public readonly water: TextureWrapper;
    
    //public readonly debug: TextureWrapper;

    constructor(settings: SettingsManager, device: GPUDevice) {
        this.rFloatTextureColors = TextureManager.createTextureSettings(settings.constants.textureSizeColors, 'r32float');
        this.rFloatTextureDraft = TextureManager.createTextureSettings(settings.constants.textureSizeDraft, 'r32float');
        this.rFloatTextureTerrain = TextureManager.createTextureSettings(settings.constants.textureSizeTerrain, 'r32float');
        this.rgFloatTextureColors = TextureManager.createTextureSettings(settings.constants.textureSizeColors, 'rg32float');
        this.rgbaFloatTextureColors = TextureManager.createTextureSettings(settings.constants.textureSizeColors, 'rgba32float');
        this.rubbleTexture = TextureManager.createTextureSettings(settings.constants.rubble.dimensions, 'rgba32float', Rubble.ITEM_LENGTH, Rubble.ITEM_BYTE_LENGTH);

        this.floatSampler = device.createSampler({
            label: 'Float Sampler',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            magFilter: 'linear',
            minFilter: 'linear'
        });

        /*this.debug = new TextureWrapper(
            device,
            TextureManager.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING,
            'Debug',
            this.rgbaFloatTextureColors
        );*/

        this.displacementDraft = new TextureWrapper(
            device,
            TextureManager.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            DisplacementRenderNode.NAME_DRAFT,
            this.rFloatTextureDraft
        );
        this.displacementFinal = new TextureWrapper(
            device,
            TextureManager.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
            DisplacementRenderNode.NAME_FINAL,
            this.rFloatTextureTerrain
        );
        this.displacementFinalCopy = new TextureWrapper(
            device,
            TextureManager.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            `${DisplacementRenderNode.NAME_FINAL} Copy`,
            this.displacementFinal.settings
        );

        this.water = new TextureWrapper(
            device,
            TextureManager.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
            WaterComputeNode.NAME,
            this.displacementFinal.settings
        );

        this.surface = new TextureWrapper(
            device,
            TextureManager.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            SurfaceRenderNode.NAME,
            this.rgFloatTextureColors
        );

        this.diffuse = new TextureWrapper(
            device,
            TextureManager.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            DiffuseRenderNode.NAME,
            this.rgbaFloatTextureColors
        );

        this.normalObjectSpace = new TextureWrapper(
            device,
            TextureManager.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            NormalObjectSpaceRenderNode.NAME,
            this.rgbaFloatTextureColors
        );

        this.normalTangentSpace = new TextureWrapper(
            device,
            TextureManager.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            NormalTangentSpaceRenderNode.NAME,
            this.normalObjectSpace.settings
        );
    }

    public dispose(): void {
        this.displacementDraft.dispose();
        this.displacementFinal.dispose();
        this.displacementFinalCopy.dispose();
        this.diffuse.dispose();
        this.normalObjectSpace.dispose();
        this.normalTangentSpace.dispose();
        this.surface.dispose();
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
                    pixelLength = TextureManager.R_PIXEL_LENGTH;
                    pixelByteLength = TextureManager.R_FLOAT_PIXEL_BYTE_LENGTH;
                    break;
                case 'rg32float':
                    pixelLength = TextureManager.RG_PIXEL_LENGTH;
                    pixelByteLength = TextureManager.RG_FLOAT_PIXEL_BYTE_LENGTH;
                    break;
                case 'rgba32float':
                    pixelLength = TextureManager.RGBA_PIXEL_LENGTH;
                    pixelByteLength = TextureManager.RGBA_FLOAT_PIXEL_BYTE_LENGTH;
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
            samplerBinding: TextureManager.FLOAT_SAMPLER_BINDING,
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