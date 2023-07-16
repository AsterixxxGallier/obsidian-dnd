import {Plugin} from 'obsidian';
import {registerDescriptionListPostProcessor} from './processors_extensions/descriptionListPostProcessor';
import {registerAttributesTablePostProcessor} from './processors_extensions/attributesTablePostProcessor';
import {registerHTMLAttributesPostProcessor} from './processors_extensions/htmlAttributesPostProcessor';
import {registerTextIndentPostProcessor} from './processors_extensions/text_indent/textIndentPostProcessor';
import {Data, Settings, addSettingTab, loadData, saveData} from './data';
import {addAssetsStyles} from './assetsStyles';
import {registerTextIndentExtension} from './processors_extensions/text_indent/textIndentExtension';
import {startAdBlocker} from './adBlocker';
import {registerWebBrowserView} from './web/webBrowserView';
import {registerHTMLFileView} from './web/htmlFileView';
import {registerHTMLFileExtensions} from './web/htmlFileView';
import {addSearchHeaderBarToNewTabView} from './web/searchHeaderBar';
import {addOpenFunctionHook, removeOpenFunctionHook} from './web/openFunctionHook';

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
		startAdBlocker.call(this);
		registerWebBrowserView.call(this);
		registerHTMLFileView.call(this);
		registerHTMLFileExtensions.call(this);
		addSearchHeaderBarToNewTabView.call(this);
		addOpenFunctionHook.call(this);
	}

	onunload() {
		removeOpenFunctionHook.call(this);
	}
}
