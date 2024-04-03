import temperateTemplate from './temperate-template.json';
import desertTemplate from './desert-template.json';
import { TemplateType } from './template-type';
import { ISettingsOptions } from './settings-options';

export class SettingsIOHelper {

    private static readonly JSON_MIME_TYPE: MIMEType = 'application/json';
    private static readonly JSON_FILE_EXTENSION: FileExtension = '.json';
    private static readonly PICKER_ACCEPT_TYPES: FilePickerAcceptType[] = [
        {
            description: 'JSON File',
            accept: {
                'application/json': [SettingsIOHelper.JSON_FILE_EXTENSION],
            },
        },
    ];
    private static readonly OPEN_PICKER_OPTIONS: OpenFilePickerOptions = {
        types: SettingsIOHelper.PICKER_ACCEPT_TYPES,
        excludeAcceptAllOption: true,
        multiple: false,
    };
    private static readonly SAVE_PICKER_OPTIONS: SaveFilePickerOptions = {
        suggestedName: `land-shaper-settings${SettingsIOHelper.JSON_FILE_EXTENSION}`,
        types: SettingsIOHelper.PICKER_ACCEPT_TYPES,
    };


    public static async load(): Promise<ISettingsOptions | undefined> {
        try {
            const fileHandle = await window.showOpenFilePicker(SettingsIOHelper.OPEN_PICKER_OPTIONS);
            if (fileHandle.length < 1) {
                return;
            }
            const file = await fileHandle[0].getFile();
            const json = await file.text();
            return JSON.parse(json) as ISettingsOptions;
        }
        catch (error) {
            console.debug(error);
        }
    }

    public static loadTemplate(template: TemplateType): ISettingsOptions | undefined {
        switch (template) {
            case TemplateType.desert:
                return desertTemplate as ISettingsOptions;
            case TemplateType.temperate:
                return temperateTemplate as ISettingsOptions;
        }
    }

    public static async save(options: ISettingsOptions): Promise<void> {
        var blob = new Blob(
            [JSON.stringify(options)],
            { type: SettingsIOHelper.JSON_MIME_TYPE }
        );
        try {
            const fileHandle = await window.showSaveFilePicker(SettingsIOHelper.SAVE_PICKER_OPTIONS);
            const writableFileStream = await fileHandle.createWritable();
            await writableFileStream.write(blob);
            await writableFileStream.close();
        }
        catch (error) {
            console.debug(error);
        }
    }
}