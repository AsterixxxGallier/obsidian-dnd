import {Plugin} from 'obsidian';
import {registerDescriptionListPostProcessor} from './descriptionListPostProcessor';
import {registerAttributesTablePostProcessor} from './attributesTablePostProcessor';
import {Data, Settings, SettingTab, loadData, saveData} from './data';
import {addAssetsStyles} from './assetsStyles';

export default class DnDPlugin extends Plugin {
	__proto__: any;
	data: Data;

	get settings(): Settings {
		return this.data.settings;
	}

	registerDescriptionListPostProcessor = registerDescriptionListPostProcessor;
	registerAttributesTablePostProcessor = registerAttributesTablePostProcessor;
	loadData = loadData;
	saveData = saveData;
	addAssetsStyles = addAssetsStyles;

	async onload() {
		await this.loadData();

		this.addSettingTab(new SettingTab(this.app, this));

		await this.addAssetsStyles();

		await this.registerDescriptionListPostProcessor();

		await this.registerAttributesTablePostProcessor();
	}

	onunload() {

	}
}
