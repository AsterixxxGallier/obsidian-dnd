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
import {test} from "./languageEngine";

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
		await test();
	}

	onunload() {
		removeOpenFunctionHook.call(this);
	}
}
