import {App, MarkdownRenderChild, Plugin, PluginManifest, PluginSettingTab} from 'obsidian';

interface Data {
	settings: Settings
}

interface Settings {
	descriptionListSeparator: string,
	attributes: string[]
}

const DEFAULT_SETTINGS: Settings = {
	descriptionListSeparator: '::',
	attributes: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
}

const DEFAULT_DATA: Data = {
	settings: DEFAULT_SETTINGS
}

export default class DnDPlugin extends Plugin {
	static instance: DnDPlugin;

	data: Data;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		DnDPlugin.instance = this;
	}

	get settings(): Settings {
		return this.data.settings;
	}

	async onload() {
		await this.loadData();

		this.addSettingTab(new SettingTab(this.app, this));

		await this.addAssetsStyles();

		await this.registerDescriptionListPostProcessor();

		await this.registerAttributesTablePostProcessor();
	}

	async addAssetsStyles() {
		const style = document.head.querySelector('style#assets') || (() => {
			const element = document.head.createEl('style');
			element.type = "text/css";
			element.id = "assets";
			return element;
		})();

		const variables: {[name: string]: string} = {};

		async function explore(folder: string, prefix: string) {
			const items = await app.vault.adapter.list(folder);
			for (const file of items.files) {
				variables[prefix + file.substring(file.lastIndexOf('/') + 1, file.lastIndexOf('.'))] =
					app.vault.adapter.getResourcePath(file);
			}
			for (const folder of items.folders) {
				await explore(folder, prefix + folder.substring(folder.lastIndexOf('/') + 1) + '-');
			}
		}

		const assetsFolder = app.vault.configDir + "/plugins/obsidian-dnd/assets";
		await explore(assetsFolder, '--');

		// the fonts have to be hardcoded because var() doesn't work in @font-face declarations
		// language=CSS
		style.innerHTML = `
		:root {
			${Object.entries(variables).map(([name, resourcePath]) => `${name}: url("${resourcePath}");`).join('\n\t\t\t')}
		}
		
		/* credit: https://github.com/naturalcrit/homebrewery/blob/master/themes/fonts/5e/fonts.less */
		/* Main Font, serif */
		@font-face {
			font-family: BookInsanityRemake;
			font-weight: normal;
			font-style: normal;
			src: url("${variables['--font-book-insanity']}");
		}

		@font-face {
			font-family: BookInsanityRemake;
			font-weight: bold;
			font-style: normal;
			src: url("${variables['--font-book-insanity-bold']}");
		}

		@font-face {
			font-family: BookInsanityRemake;
			font-weight: normal;
			font-style: italic;
			src: url("${variables['--font-book-insanity-italic']}");
		}

		@font-face {
			font-family: BookInsanityRemake;
			font-weight: bold;
			font-style: italic;
			src: url("${variables['--font-book-insanity-bold-italic']}");
		}

		/* Notes and Tables, sans-serif */
		@font-face {
			font-family: ScalySansRemake;
			font-weight: normal;
			font-style: normal;
			src: url("${variables['--font-scaly-sans']}");
		}

		@font-face {
			font-family: ScalySansRemake;
			font-weight: bold;
			font-style: normal;
			src: url("${variables['--font-scaly-sans-bold']}");
		}

		@font-face {
			font-family: ScalySansRemake;
			font-weight: normal;
			font-style: italic;
			src: url("${variables['--font-scaly-sans-italic']}");
		}

		@font-face {
			font-family: ScalySansRemake;
			font-weight: bold;
			font-style: italic;
			src: url("${variables['--font-scaly-sans-bold-italic']}");
		}

		@font-face {
			font-family: ScalySansSmallCapsRemake;
			font-weight: normal;
			font-style: normal;
			src: url("${variables['--font-scaly-sans-caps']}");
		}

		@font-face {
			font-family: WalterTurncoat;
			font-weight: normal;
			font-style: normal;
			src: url("${variables['--font-walter-turncoat']}");
		}

		/* Headers */
		@font-face {
			font-family: MrEavesRemake;
			font-weight: normal;
			font-style: normal;
			src: url("${variables['--font-mr-eaves-small-caps']}");
		}

		/* Fancy Drop Cap */
		@font-face {
			font-family: SolberaImitationRemake;
			font-weight: normal;
			font-style: normal;
			src: url("${variables['--font-solbera-imitation']}");
		}

		/* Cover Page */
		@font-face {
			font-family: NodestoCapsCondensed;
			font-weight: bold;
			font-style: normal;
			src: url("${variables['--font-nodesto-caps-condensed']}");
		}

		@font-face {
			font-family: NodestoCapsCondensed;
			font-weight: normal;
			font-style: normal;
			src: url("${variables['--font-nodesto-caps-condensed-bold']}");
		}

		@font-face {
			font-family: NodestoCapsCondensed;
			font-weight: normal;
			font-style: italic;
			src: url("${variables['--font-nodesto-caps-condensed-italic']}");
		}

		@font-face {
			font-family: NodestoCapsCondensed;
			font-weight: bold;
			font-style: italic;
			src: url("${variables['--font-nodesto-caps-condensed-bold-italic']}");
		}

		@font-face {
			font-family: NodestoCapsWide;
			font-weight: normal;
			font-style: normal;
			src: url("${variables['--font-nodesto-caps-wide']}");
		}

		@font-face {
			font-family: Overpass;
			font-weight: 500;
			font-style: normal;
			src: url("${variables['--font-overpass']}");
		}

		@font-face {
			font-family: Davek;
			font-weight: 500;
			font-style: normal;
			src: url("${variables['--font-davek']}");
		}

		@font-face {
			font-family: Iokharic;
			font-weight: 500;
			font-style: normal;
			src: url("${variables['--font-iokharic']}");
		}

		@font-face {
			font-family: Rellanic;
			font-weight: 500;
			font-style: normal;
			src: url("${variables['--font-rellanic']}");
		}
		`
	}

	async registerDescriptionListPostProcessor() {
		this.registerMarkdownPostProcessor((element, context) => {
			const lists = element.querySelectorAll('ul');
			for (let i = 0; i < lists.length; i++) {
				const list = lists.item(i);
				if (Array.from(list.querySelectorAll(':scope > li'))
					.every(node => node.textContent!.includes(this.settings.descriptionListSeparator))) {
					context.addChild(new DescriptionList(list));
				}
			}
		});
	}

	async registerAttributesTablePostProcessor() {
		this.registerMarkdownCodeBlockProcessor('attributes', (source, el, context) => {
			const scores = source.split('/').map(s => s.trim());
			console.assert(scores.length == 6);

			const table = el.createEl('table', {cls: 'attributes'});
			const head = table.createEl('thead');
			const headRow = head.createEl('tr');
			const body = table.createEl('tbody');
			const bodyRow = body.createEl('tr');

			for (let i = 0; i < 6; i++) {
				const attribute = this.settings.attributes[i];
				const score = scores[i];
				const modifier = Math.floor(parseInt(score) / 2) - 5;
				const signedModifier = modifier >= 0 ? "+" + modifier : "" + modifier;
				headRow.createEl('th', {text: attribute});
				bodyRow.createEl('td', {text: `${score} (${signedModifier})`});
			}
		});
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

class DescriptionList extends MarkdownRenderChild {
	constructor(containerEl: HTMLElement) {
		super(containerEl);
	}

	onload() {
		const separator = DnDPlugin.instance.settings.descriptionListSeparator;

		const items = Array.from(this.containerEl.querySelectorAll(':scope > li'));

		const list = this.containerEl.createEl('dl');

		for (const item of items) {
			const innerHTML = item.innerHTML;
			const index = innerHTML.indexOf(separator);

			if (index == -1) {
				const description = list.createEl('dd');
				description.innerHTML = innerHTML;
			} else {
				const term = list.createEl('dt');
				term.innerHTML = innerHTML.substring(0, index).trim();

				const description = list.createEl('dd');
				description.innerHTML = innerHTML.substring(index + separator.length).trim();
			}
		}

		this.containerEl.replaceWith(list);
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
