import {Plugin} from 'obsidian';
import {registerDescriptionListPostProcessor} from './descriptionListPostProcessor';
import {registerAttributesTablePostProcessor} from './attributesTablePostProcessor';
import {registerHTMLAttributesPostProcessor} from './htmlAttributesPostProcessor';
import {registerTextIndentPostProcessor} from './textIndentPostProcessor';
import {Data, Settings, SettingTab, loadData, saveData} from './data';
import {addAssetsStyles} from './assetsStyles';
import {registerTextIndentExtension} from "./textIndentExtension";

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

		this.addSettingTab(new SettingTab(this.app, this));

		await addAssetsStyles.call(this);

		registerDescriptionListPostProcessor.call(this);

		registerAttributesTablePostProcessor.call(this);

		registerHTMLAttributesPostProcessor.call(this);

		registerTextIndentPostProcessor.call(this);

		registerTextIndentExtension.call(this);
	}

	onunload() {

	}
}
