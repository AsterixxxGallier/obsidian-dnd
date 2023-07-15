import { App, Plugin, PluginSettingTab } from 'obsidian';

interface Data {
	settings: Settings
}

interface Settings {
}

const DEFAULT_SETTINGS: Settings = {
}

const DEFAULT_DATA: Data = {
	settings: DEFAULT_SETTINGS
}

export default class DnDPlugin extends Plugin {
	data: Data;

	get settings(): Settings {
		return this.data.settings;
	}

	async onload() {
		await this.loadData();

		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {

	}

	async loadData() {
		this.data = Object.assign({}, DEFAULT_DATA, await super.loadData());
	}

	async saveData() {
		await super.saveData(this.data);
	}
}

class SettingTab extends PluginSettingTab {
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
