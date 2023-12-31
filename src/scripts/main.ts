import {Plugin} from 'obsidian';
import {registerDescriptionListPostProcessor} from './processors_extensions/descriptionListPostProcessor';
import {registerAttributesTablePostProcessor} from './processors_extensions/attributesTablePostProcessor';
import {registerHTMLAttributesPostProcessor} from './processors_extensions/htmlAttributesPostProcessor';
import {registerTextIndentPostProcessor} from './processors_extensions/text_indent/textIndentPostProcessor';
import {addSettingTab, Data, loadData, saveData, Settings} from './data';
import {addAssetsStyles} from './assetsStyles';
import {registerTextIndentExtension} from './processors_extensions/text_indent/textIndentExtension';
import {addMixRibbonIcon, registerMixView} from './mix/mixView';
import {startAdBlocker} from './web/adBlocker';
import {registerWebBrowserView} from './web/webBrowserView';
import {registerHTMLFileExtensions, registerHTMLFileView} from './web/htmlFileView';
import {addSearchHeaderBarToNewTabView} from './web/searchHeaderBar';
import {addOpenFunctionHook, removeOpenFunctionHook} from './web/openFunctionHook';
import {registerPromptCommand} from "./languageProcessing/promptCommand";
import {registerSummarizeCommand} from "./languageProcessing/summarizeCommand";
import {registerLogPDFTextCommand} from "./pdfProcessing/logPDFTextCommand";
import {registerOpenAssociatedPageCommands} from "./web/openAssociatedPageCommands";
import {registerHOCRImportCommand} from "./pdfProcessing/hocrImport";
import {registerOverlayPDFScanCommand} from "./pdfProcessing/overlayPDFScanCommand";
import {registerExportPDFPagesCommand} from "./pdfProcessing/exportPDFPagesCommand";
import {registerCleanPDFScanCommand} from "./pdfProcessing/cleanPDFScanCommand";
import {registerSetCustomPDFPrefixCommand} from "./pdfProcessing/setCustomPDFPrefixCommand";

export default class DnDPlugin extends Plugin {
	__proto__: any;
	data: Data;

	get settings(): Settings {
		return this.data.settings;
	}

	loadData = loadData;
	saveData = saveData;

	async onload() {
		await this.loadData();
		addSettingTab.call(this);
		await addAssetsStyles.call(this);
		registerDescriptionListPostProcessor.call(this);
		registerAttributesTablePostProcessor.call(this);
		registerHTMLAttributesPostProcessor.call(this);
		registerTextIndentPostProcessor.call(this);
		registerTextIndentExtension.call(this);
		registerMixView.call(this);
		addMixRibbonIcon.call(this);
		await startAdBlocker.call(this);
		registerWebBrowserView.call(this);
		registerHTMLFileView.call(this);
		registerHTMLFileExtensions.call(this);
		addSearchHeaderBarToNewTabView.call(this);
		addOpenFunctionHook.call(this);
		registerPromptCommand.call(this);
		registerSummarizeCommand.call(this);
		registerHOCRImportCommand.call(this);
		registerLogPDFTextCommand.call(this);
		registerExportPDFPagesCommand.call(this);
		registerOverlayPDFScanCommand.call(this);
		registerCleanPDFScanCommand.call(this);
		registerSetCustomPDFPrefixCommand.call(this);
		registerOpenAssociatedPageCommands.call(this);
		const interval = this.data.settings.saveSettingsInterval;
		this.registerInterval(window.setInterval(() => this.saveData(), interval));
		this.registerEvent(app.workspace.on("window-close", () => this.saveData()));
	}

	async onunload() {
		await this.saveData();
		removeOpenFunctionHook.call(this);
	}
}
