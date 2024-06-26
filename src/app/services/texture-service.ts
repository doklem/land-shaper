import {
    ClampToEdgeWrapping,
    DataTexture,
    FloatType,
    LinearFilter,
    LinearMipmapLinearFilter,
    Matrix4,
    MeshStandardMaterial,
    PixelFormat,
    RedFormat,
    RGBAFormat,
    RGFormat,
    TextureDataType,
    UnsignedByteType,
    UVMapping,
    Vector2
} from 'three';
import { IDisposable } from '../disposable';
import { ITextureSettings } from '../settings/texture-settings';
import { TextureWrapper } from './texture-wrapper';
import { NormalTangentSpaceRenderNode } from '../nodes/render-nodes/normal-tangent-space-render-node';
import { NormalObjectSpaceRenderNode } from '../nodes/render-nodes/normal-object-space-render-node';
import { DiffuseRenderNode } from '../nodes/render-nodes/diffuse-render-node';
import { DisplacementRenderNode } from '../nodes/render-nodes/displacement-render-node';
import { WaterComputeNode } from '../nodes/compute-nodes/water-compute-node';
import { SurfaceRenderNode } from '../nodes/render-nodes/surface-render-node';
import { SettingsService } from './settings-service';
import { ErosionDifferenceRenderNode } from '../nodes/render-nodes/erosion-difference-render-node';
import { BumpsRenderNode } from '../nodes/render-nodes/bumps-render-node';

export class TextureService implements IDisposable {

    public static readonly R_PIXEL_LENGTH = 1;
    public static readonly RG_PIXEL_LENGTH = 2;
    public static readonly RGBA_PIXEL_LENGTH = 4;
    public static readonly MATRIX_4X4_LENGTH = Matrix4.length;

    private static readonly R_FLOAT_PIXEL_BYTE_LENGTH = TextureService.R_PIXEL_LENGTH * Float32Array.BYTES_PER_ELEMENT;
    private static readonly RG_FLOAT_PIXEL_BYTE_LENGTH = TextureService.RG_PIXEL_LENGTH * Float32Array.BYTES_PER_ELEMENT;
    private static readonly RGBA_FLOAT_PIXEL_BYTE_LENGTH = TextureService.RGBA_PIXEL_LENGTH * Float32Array.BYTES_PER_ELEMENT;
    private static readonly RGBA_BYTE_PIXEL_BYTE_LENGTH = TextureService.RGBA_PIXEL_LENGTH * Uint8Array.BYTES_PER_ELEMENT;
    private static readonly FLOAT_TEXTURE_SAMPLE: GPUTextureSampleType = 'float';

    public readonly bumps: TextureWrapper;
    public readonly bumpsSection: TextureWrapper;
    public readonly displacementErosion: TextureWrapper;
    public readonly displacementErosionBedrock: TextureWrapper;
    public readonly displacementErosionDifference: TextureWrapper;
    public readonly displacementErosionSediment: TextureWrapper;
    public readonly displacementErosionUntouched: TextureWrapper;
    public readonly displacementSection: TextureWrapper;
    public readonly displacementTopology: TextureWrapper;
    public readonly diffuse: TextureWrapper;
    public readonly diffuseSection: TextureWrapper;
    public readonly normalObjectSpace: TextureWrapper;
    public readonly normalObjectSpaceSection: TextureWrapper;
    public readonly normalTangentSpace: TextureWrapper;
    public readonly normalTangentSpaceSection: TextureWrapper;
    public readonly rFloatTextureColors: ITextureSettings;
    public readonly rFloatTextureColorsSection: ITextureSettings;
    public readonly rFloatTextureTopology: ITextureSettings;
    public readonly rFloatTextureTerrain: ITextureSettings;
    public readonly rFloatTextureTerrainSection: ITextureSettings;
    public readonly rgFloatTextureColors: ITextureSettings;
    public readonly rgFloatTextureColorsSection: ITextureSettings;
    public readonly rgbaFloatTextureColors: ITextureSettings;
    public readonly rgbaFloatTextureColorsSection: ITextureSettings;
    public readonly rgbaByteTextureColors: ITextureSettings;
    public readonly rgbaByteTextureColorsSection: ITextureSettings;
    public readonly samplerLinearClamping: GPUSampler;
    public readonly surface: TextureWrapper;
    public readonly surfaceSection: TextureWrapper;
    public readonly water: TextureWrapper;

    constructor(settings: SettingsService, device: GPUDevice) {
        this.rFloatTextureColors = TextureService.createTextureSettings(settings.constants.textureSizeColors, 'r32float');
        this.rFloatTextureColorsSection = TextureService.createTextureSettings(settings.constants.sections.textureSizeColors, 'r32float');
        this.rFloatTextureTopology = TextureService.createTextureSettings(settings.constants.textureSizeTopology, 'r32float');
        this.rFloatTextureTerrain = TextureService.createTextureSettings(settings.constants.textureSizeTerrain, 'r32float');
        this.rFloatTextureTerrainSection = TextureService.createTextureSettings(settings.constants.sections.textureSizeTerrain, 'r32float');
        this.rgFloatTextureColors = TextureService.createTextureSettings(settings.constants.textureSizeColors, 'rg32float');
        this.rgFloatTextureColorsSection = TextureService.createTextureSettings(settings.constants.sections.textureSizeColors, 'rg32float');
        this.rgbaFloatTextureColors = TextureService.createTextureSettings(settings.constants.textureSizeColors, 'rgba32float');
        this.rgbaFloatTextureColorsSection = TextureService.createTextureSettings(settings.constants.sections.textureSizeColors, 'rgba32float');
        this.rgbaByteTextureColors = TextureService.createTextureSettings(settings.constants.textureSizeColors, 'rgba8unorm');
        this.rgbaByteTextureColorsSection = TextureService.createTextureSettings(settings.constants.sections.textureSizeColors, 'rgba8unorm');

        this.samplerLinearClamping = device.createSampler({
            label: 'Sampler Linear Clamping',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            magFilter: 'linear',
            minFilter: 'linear'
        });

        this.displacementTopology = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            DisplacementRenderNode.NAME_TOPOLOGY,
            this.rFloatTextureTopology
        );
        this.displacementErosionUntouched = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            DisplacementRenderNode.NAME_EROSION_UNTOUCHED,
            this.rFloatTextureTerrain
        );
        this.displacementErosionDifference = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC/* | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST*/,
            ErosionDifferenceRenderNode.NAME,
            this.rgbaByteTextureColors
        );
        this.displacementErosion = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
            DisplacementRenderNode.NAME_EROSION,
            this.displacementErosionUntouched.settings
        );
        this.displacementErosionBedrock = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
            DisplacementRenderNode.NAME_EROSION_BEDROCK,
            this.displacementErosionUntouched.settings
        );
        this.displacementErosionSediment = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
            DisplacementRenderNode.NAME_EROSION_SEDIMENT,
            this.displacementErosionUntouched.settings
        );
        this.displacementSection = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            `${DisplacementRenderNode.NAME_EROSION} Section`,
            this.rFloatTextureTerrainSection
        );

        this.water = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
            WaterComputeNode.NAME,
            this.displacementErosion.settings
        );

        this.surface = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            SurfaceRenderNode.NAME,
            this.rgbaFloatTextureColors
        );
        this.surfaceSection = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            `${SurfaceRenderNode.NAME} Section`,
            this.rgbaFloatTextureColorsSection
        );

        this.diffuse = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            DiffuseRenderNode.NAME,
            this.rgbaByteTextureColors
        );
        this.diffuseSection = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
            `${DiffuseRenderNode.NAME} Section`,
            this.rgbaByteTextureColorsSection
        );

        this.bumps = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            BumpsRenderNode.NAME,
            this.rFloatTextureColors
        );
        this.bumpsSection = new TextureWrapper(
            device,
            TextureService.FLOAT_TEXTURE_SAMPLE,
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            `${BumpsRenderNode.NAME} Section`,
            this.rFloatTextureColorsSection
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
        this.bumps.dispose();
        this.bumpsSection.dispose();
        this.displacementErosion.dispose();
        this.displacementErosionBedrock.dispose();
        this.displacementErosionDifference.dispose();
        this.displacementErosionSediment.dispose();
        this.displacementErosionUntouched.dispose();
        this.displacementTopology.dispose();
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
                case 'rgba8unorm':
                    pixelLength = TextureService.RGBA_PIXEL_LENGTH;
                    pixelByteLength = TextureService.RGBA_BYTE_PIXEL_BYTE_LENGTH;
                    break;
                default:
                    throw new Error(`There is no pixel length and pixel byte length defined for the texture format ${format}`);
            }
        }

        const pixelCount = size.x * size.y;
        return {
            width: size.x,
            height: size.y,
            size: pixelCount,
            bytesPerRow: size.x * pixelByteLength,
            byteLength: pixelCount * pixelByteLength,
            valuesLength: pixelCount * pixelLength,
            samplerBinding: 'filtering',
            format
        };
    }

    public static createDataTexture(array: Float32Array | Uint8Array, settings: ITextureSettings, midmaps?: boolean, anisotropy?: number): DataTexture {
        if (array.length != settings.valuesLength) {
            throw new Error(`The given array's size is ${array.length}, but it has to be ${settings.valuesLength} to match the given texture settings`);
        }
        let format: PixelFormat;
        let type: TextureDataType;
        switch (settings.format) {
            case 'r32float':
                format = RedFormat;
                type = FloatType;
                break;
            case 'rg32float':
                format = RGFormat;
                type = FloatType;
                break;
            case 'rgba32float':
                format = RGBAFormat;
                type = FloatType;
                break;
            case 'rgba8unorm':
                format = RGBAFormat;
                type = UnsignedByteType;
                break;
            default:
                throw new Error(`There is no data texture format defined for the given texture settings format ${settings.format}`);
        }
        const texture = new DataTexture(
            array,
            settings.width,
            settings.height,
            format,
            type,
            midmaps ? UVMapping : undefined,
            midmaps ? ClampToEdgeWrapping : undefined,
            midmaps ? ClampToEdgeWrapping : undefined,
            midmaps ? LinearFilter : undefined,
            midmaps ? LinearMipmapLinearFilter : undefined,
            anisotropy);
        texture.generateMipmaps = midmaps === true;
        return texture;
    }
}