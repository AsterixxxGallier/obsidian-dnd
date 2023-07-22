import {App, PluginSettingTab} from "obsidian";
import DnDPlugin from "./main";

export interface Settings {
	descriptionListSeparator: string,
	attributes: string[],
	textIndentPrefix: string,
}

export interface Website {
	id: string,
	urlPattern: string,
	titlePattern: string,
	script: string,
	searchPlaceholder: string,
	searchPrefix: string,
	pagePrefix: string | undefined,
}

type Websites = Website[];

export interface Data {
	settings: Settings,
	websites: Websites
}

const DEFAULT_SETTINGS: Settings = {
	descriptionListSeparator: '::',
	attributes: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
	textIndentPrefix: '~ ',
}

const DEFAULT_WEBSITES: Websites = [
	{
		id: 'duckduckgo',
		urlPattern: 'duckduckgo.com',
		titlePattern: '(?:site:\\S+ )?(.+?) at DuckDuckGo',
		// language=JavaScript
		script: `
			Array.from(document.querySelectorAll('.badge--ad-wrap'))
				.forEach(el => el.parentElement.parentElement.parentElement.parentElement.parentElement.remove());
			document.querySelectorAll('[data-testid="site-filter"]').forEach(el => el.remove());
		`,
		searchPlaceholder: 'Search with DuckDuckGo',
		searchPrefix: 'https://duckduckgo.com/?q=',
		pagePrefix: undefined,
	},
	{
		id: 'fandom',
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
				,div[itemprop="video"]'
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
		searchPlaceholder: 'Search the Forgotten Realms Wiki',
		searchPrefix: 'https://forgottenrealms.fandom.com/wiki/Special:Search?query=',
		pagePrefix: 'https://forgottenrealms.fandom.com/wiki/',
	},
	{
		id: 'wikidot',
		urlPattern: 'wikidot.com',
		titlePattern: '([^|]+) \- DND 5th Edition',
		// language=JavaScript
		script: `
			document.querySelectorAll(
				'div#ncmp__tool\\
				,div#navi-bar\\
				,div#navi-bar-shadow\\
				,header.header-wrap\\
				,nav.side-bar-wrap\\
				,footer.footer-wrap\\
				,div#footer-bar\\
				,div.wd-adunit'
			).forEach(it => it.remove());
	
			const contentContainer = document.querySelector('main > .content');
			if (getComputedStyle(contentContainer).top.startsWith('-')) {
				contentContainer.style.top = '0';
				contentContainer.style.marginTop = '20px';
				contentContainer.style.marginBottom = '20px';
			}
	
			const mainContentWrap = document.querySelector('.main-content-wrap');
			mainContentWrap.style.float = 'none';
		`,
		searchPlaceholder: 'Search the D&D 5th edition community wiki',
		searchPrefix: 'https://duckduckgo.com/?q=site%3Adnd5e.wikidot.com+',
		pagePrefix: 'https://dnd5e.wikidot.com/',
	}
]

const DEFAULT_DATA: Data = {
	settings: DEFAULT_SETTINGS,
	websites: DEFAULT_WEBSITES,
}

export let data: Data;
export let settings: Settings;

export function getScript(url: string): string {
	return Object.entries(data.scripts).find(([pattern]) => new RegExp(pattern).test(url))?.[1] ?? '';
}

export async function loadData(this: DnDPlugin) {
	this.data = Object.assign({}, DEFAULT_DATA, await this.__proto__.loadData.call(this));
	data = this.data;
	settings = this.settings;
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

export function addSettingTab(this: DnDPlugin) {
	this.addSettingTab(new SettingTab(this.app, this));
}
