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

	registerDescriptionListPostProcessor = registerDescriptionListPostProcessor;
	registerAttributesTablePostProcessor = registerAttributesTablePostProcessor;
	registerHTMLAttributesPostProcessor = registerHTMLAttributesPostProcessor;
	registerTextIndentPostProcessor = registerTextIndentPostProcessor;
	registerTextIndentExtension = registerTextIndentExtension;
	loadData = loadData;
	saveData = saveData;
	addAssetsStyles = addAssetsStyles;

	async onload() {
		await this.loadData();

		this.addSettingTab(new SettingTab(this.app, this));

		await this.addAssetsStyles();

		await this.registerDescriptionListPostProcessor();

		await this.registerAttributesTablePostProcessor();

		await this.registerHTMLAttributesPostProcessor();

		await this.registerTextIndentPostProcessor();

		this.registerTextIndentExtension();
	}

	onunload() {

	}
}
