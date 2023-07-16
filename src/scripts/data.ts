import {App, PluginSettingTab} from "obsidian";
import DnDPlugin from "./main";

export interface Settings {
	descriptionListSeparator: string,
	attributes: string[],
	textIndentPrefix: string,
}

export interface Data {
	settings: Settings
}

const DEFAULT_SETTINGS: Settings = {
	descriptionListSeparator: '::',
	attributes: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
	textIndentPrefix: '~ ',
}

const DEFAULT_DATA: Data = {
	settings: DEFAULT_SETTINGS
}

export async function loadData(this: DnDPlugin) {
	this.data = Object.assign({}, DEFAULT_DATA, await this.__proto__.loadData.call(this, ));
}

export async function saveData(this: DnDPlugin) {
	await this.__proto__.saveData.call(this, this.data);
}

export class SettingTab extends PluginSettingTab {
	plugin: DnDPlugin;

	constructor(app: App, plugin: DnDPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
	}
}
