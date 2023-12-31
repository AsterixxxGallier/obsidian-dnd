import {App, PluginSettingTab, TFile} from "obsidian";
import DnDPlugin from "./main";
import {ScannedDocument} from "./pdfProcessing/hocrImport";

export interface Settings {
	descriptionListSeparator: string,
	attributes: string[],
	textIndentPrefix: string,
	pdfPageExportDirectoryPath: string,
	// milliseconds
	saveSettingsInterval: number,
}

export interface WebsiteDisplayInformation {
	urlPattern: string,
	titlePattern: string | undefined,
	script: string | undefined,
}

export interface SearchEngine {
	id: string,
	searchPlaceholder: string,
	searchPrefix: string,
}

export interface Wiki {
	id: string,
	displayName: string,
	pagePrefix: string,
}

export interface Data {
	settings: Settings,
	websiteDisplayInformation: WebsiteDisplayInformation[],
	searchEngines: SearchEngine[],
	wikis: Wiki[],
	customPDFPrefixes: { [pdfPath: string]: string },
}

const DEFAULT_SETTINGS: Settings = {
	descriptionListSeparator: '::',
	attributes: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
	textIndentPrefix: '~ ',
	pdfPageExportDirectoryPath: 'pdfPageExport/',
	saveSettingsInterval: 60 * 1000,
}

const DEFAULT_WEBSITE_DISPLAY_INFORMATION: WebsiteDisplayInformation[] = [
	{
		urlPattern: 'duckduckgo.com',
		titlePattern: '(?:site:\\S+ )?(.+?) at DuckDuckGo',
		// language=JavaScript
		script: `
			Array.from(document.querySelectorAll('.badge--ad-wrap'))
				.forEach(el => el.parentElement.parentElement.parentElement.parentElement.parentElement.remove());
			document.querySelectorAll('[data-testid="site-filter"]').forEach(el => el.remove());
		`,
	},
	{
		urlPattern: 'forgottenrealms.fandom.com',
		titlePattern: '([^|]+) \\| Forgotten Realms Wiki \\| Fandom',
		// language=JavaScript
		script: `
			document.querySelectorAll(
				'div.top-ads-container\\
				,div.bottom-ads-container\\
				,div.global-navigation\\
				,div.page-footer\\
				,footer.global-footer\\\
				,div#mixed-content-footer\\
				,div#WikiaBar\\
				,aside.page__right-rail\\
				,div.fandom-sticky-header\\
				,div.community-header-wrapper\\
				,div.page-side-tools__wrapper\\
				,div.page-header__actions\\
				,div#scroll-banner\\
				,div.page-header__languages\\
				,div.notifications-placeholder\\
				,div[itemprop="video"]\\
				,div.gpt-ad\\
				,div.ad-slot-placeholder'
			).forEach(it => it.remove());
	
			const mainContainer = document.querySelector('div.main-container');
			mainContainer.style.marginLeft = '0';
			mainContainer.style.width = '100%';
	
			const background = document.querySelector('div.fandom-community-header__background.fullScreen');
			background.style.width = '100%';
	
			const mainPage = document.querySelector('main.page__main');
			mainPage.style.background = 'rgba(255, 255, 255, 0.9)';
			mainPage.style.paddingTop = '24px';
		`,
	},
	{
		urlPattern: 'wikidot.com',
		titlePattern: '([^|]+) \- DND 5th Edition',
		// language=JavaScript
		script: `
			document.querySelectorAll(
				'div#ncmp__tool\\
				,div#ncmp__banner\\
				,div#navi-bar\\
				,div#navi-bar-shadow\\
				,header.header-wrap\\
				,nav.side-bar-wrap\\
				,footer.footer-wrap\\
				,div#footer-bar\\
				,div.wd-adunit'
			).forEach(it => it.remove());
	
			const contentContainer = document.querySelector('main > .content');
            contentContainer.style.maxWidth = '970px';
			if (getComputedStyle(contentContainer).top.startsWith('-')) {
				contentContainer.style.top = '0';
				contentContainer.style.marginTop = '20px';
				contentContainer.style.marginBottom = '20px';
			}
	
			const mainContentWrap = document.querySelector('.main-content-wrap');
			mainContentWrap.style.float = 'none';
            mainContentWrap.classList.remove('col-md-9');
            mainContentWrap.classList.add('col-md-12');
		`,
	}
]

const DEFAULT_SEARCH_ENGINES: SearchEngine[] = [
	{
		id: 'd',
		searchPlaceholder: 'Search with DuckDuckGo',
		searchPrefix: 'https://duckduckgo.com/?q=',
	},
	{
		id: 'f',
		searchPlaceholder: 'Search the Forgotten Realms Wiki',
		searchPrefix: 'https://forgottenrealms.fandom.com/wiki/Special:Search?query=',
	},
	{
		id: 'w',
		searchPlaceholder: 'Search the D&D 5th edition community wiki',
		searchPrefix: 'https://duckduckgo.com/?q=site%3Adnd5e.wikidot.com+',
	}
]

const DEFAULT_WIKIS: Wiki[] = [
	{
		id: 'fandom',
		displayName: 'the Forgotten Realms Fandom',
		pagePrefix: 'https://forgottenrealms.fandom.com/wiki/',
	},
	{
		id: 'wikidot',
		displayName: 'Wikidot',
		pagePrefix: 'https://dnd5e.wikidot.com/',
	}
]

const DEFAULT_DATA: Data = {
	settings: DEFAULT_SETTINGS,
	websiteDisplayInformation: DEFAULT_WEBSITE_DISPLAY_INFORMATION,
	searchEngines: DEFAULT_SEARCH_ENGINES,
	wikis: DEFAULT_WIKIS,
	customPDFPrefixes: {},
}

export let scannedPDFs: { [pdfPath: string]: ScannedDocument } = {};
let scannedPDFsChanged: boolean = false;
export let data: Data;
export let settings: Settings;

export function getScript(url: string): string {
	return data.websiteDisplayInformation.find(website => new RegExp(website.urlPattern).test(url))?.script ?? '';
}

export function loadScannedPDFs() {
	app.workspace.onLayoutReady(async () => {
		const pdfs = <TFile[]>app.vault.getAllLoadedFiles()
			.filter(file => (file instanceof TFile) && file.extension == "pdf");
		for (const pdf of pdfs) {
			const dataPath = pdf.path + ".json";
			if (await app.vault.adapter.exists(dataPath)) {
				const data = await app.vault.adapter.read(dataPath);
				scannedPDFs[pdf.path] = <ScannedDocument>JSON.parse(data);
				console.log("loaded scan of " + pdf.path);
			}
		}
	});
}

export function markScannedPDFsChanged() {
	scannedPDFsChanged = true;
}

export async function saveScannedPDFs() {
	console.log("saving pdf scan data");
	for (const pdf in scannedPDFs) {
		await app.vault.adapter.write(pdf + ".json", JSON.stringify(scannedPDFs[pdf]));
	}
}

export async function loadData(this: DnDPlugin) {
	this.data = Object.assign({}, DEFAULT_DATA, await this.__proto__.loadData.call(this));
	data = this.data;
	// @ts-ignore
	window.data = data;
	settings = this.settings;
	loadScannedPDFs();
	// @ts-ignore
	window.scannedPDFs = scannedPDFs;
}

export async function saveData(this: DnDPlugin) {
	await this.__proto__.saveData.call(this, this.data);
	if (scannedPDFsChanged) await saveScannedPDFs();
	scannedPDFsChanged = false;
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

export function addSettingTab(this: DnDPlugin) {
	this.addSettingTab(new SettingTab(this.app, this));
}
