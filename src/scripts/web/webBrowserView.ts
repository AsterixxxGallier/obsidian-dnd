// CREDITS: https://github.com/Trikzon/obsidian-web-browser/blob/main/src/web_browser_view.ts

import DnDPlugin from '../main';

import {ItemView, ViewStateResult} from 'obsidian';
import {SearchHeaderBar} from './searchHeaderBar';

export const WEB_BROWSER_VIEW_ID = 'web-browser-view';

export class WebBrowserView extends ItemView {
	private currentUrl: string;
	private currentTitle: string = 'New tab';

	private headerBar: SearchHeaderBar;
	private favicon: HTMLImageElement;
	private frame: HTMLIFrameElement;

	static async spawnWebBrowserView(newLeaf: boolean, state: WebBrowserViewState) {
		const leaf = app.workspace.getLeaf(newLeaf);
		await leaf.setViewState({type: WEB_BROWSER_VIEW_ID, active: true, state});
	}

	getDisplayText(): string {
		return this.currentTitle;
	}

	getViewType(): string {
		return WEB_BROWSER_VIEW_ID;
	}

	async onOpen() {
		// Don't allow views to replace this view.
		this.navigation = false;

		this.contentEl.empty();

		// Create search bar in the header bar.
		this.headerBar = new SearchHeaderBar(this.headerEl.children[2]);

		// Create favicon image element.
		this.favicon = document.createElement("img") as HTMLImageElement;
		this.favicon.width = 16;
		this.favicon.height = 16;

		// Create main web view frame that displays the website.
		this.frame = document.createElement("webview") as HTMLIFrameElement;
		this.frame.setAttribute("allowpopups", "");
		// CSS classes makes frame fill the entire tab's content space.
		this.frame.addClass("web-browser-frame");
		this.contentEl.addClass("web-browser-view-content");
		this.contentEl.appendChild(this.frame);

		this.headerBar.addOnSearchBarEnterListener((url: string) => {
			this.navigate(url);
		});

		this.frame.addEventListener("dom-ready", () => {
			const {remote} = require('electron');
			// @ts-ignore
			const webContents = remote.webContents.fromId(this.frame.getWebContentsId());
			// console.log('webContents:', webContents);
			// webContents.on('console-message', (event, level, message) => {
			// 	console.log('WebView console message (level ' + level + '): \n' + message);
			// });
			webContents.executeJavaScript(`
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
			`);

			// Open new browser tab if the web view requests it.
			webContents.setWindowOpenHandler(async (event: any) => {
				await WebBrowserView.spawnWebBrowserView(true, {url: event.url});
			});

			// For getting keyboard event from webview
			webContents.on('before-input-event', (event: any, input: any) => {
				if (input.type !== 'keyDown') {
					return;
				}

				// Create a fake KeyboardEvent from the data provided
				const emulatedKeyboardEvent = new KeyboardEvent('keydown', {
					code: input.code,
					key: input.key,
					shiftKey: input.shift,
					altKey: input.alt,
					ctrlKey: input.control,
					metaKey: input.meta,
					repeat: input.isAutoRepeat
				});

				// TODO Detect pressed hotkeys if exists in default hotkeys list
				// If so, prevent default and execute the hotkey
				// If not, send the event to the webview
				activeDocument.body.dispatchEvent(emulatedKeyboardEvent);
			});
		});

		// When focus set current leaf active;
		this.frame.addEventListener("focus", () => {
			app.workspace.setActiveLeaf(this.leaf);
		});

		this.frame.addEventListener("page-favicon-updated", (event: any) => {
			this.favicon.src = event.favicons[0];
			this.leaf.tabHeaderInnerIconEl.empty();
			this.leaf.tabHeaderInnerIconEl.appendChild(this.favicon);
		});

		this.frame.addEventListener("page-title-updated", (event: any) => {
			let title = event.title;
			const end = ' | Forgotten Realms Wiki | Fandom';
			if (title.endsWith(end)) {
				title = title.substring(0, title.length - end.length);
			}
			this.leaf.tabHeaderInnerTitleEl.innerText = title;
			this.currentTitle = title;
		});

		this.frame.addEventListener("will-navigate", (event: any) => {
			this.navigate(event.url, true, false);
		});

		this.frame.addEventListener("did-navigate-in-page", (event: any) => {
			this.navigate(event.url, true, false);
		});

		this.frame.addEventListener("new-window", (event: any) => {
			console.log("Trying to open new window at url: " + event.url);
			event.preventDefault();
		});

		console.log(this.frame);
	}

	async setState(state: WebBrowserViewState, result: ViewStateResult) {
		this.navigate(state.url, false);
	}

	getState(): WebBrowserViewState {
		return {url: this.currentUrl};
	}

	navigate(url: string, addToHistory: boolean = true, updateWebView: boolean = true) {
		if (url === "") {
			return;
		}

		if (addToHistory) {
			if (this.leaf.history.backHistory.last()?.state?.state?.url !== this.currentUrl) {
				this.leaf.history.backHistory.push({
					state: {
						type: WEB_BROWSER_VIEW_ID,
						state: this.getState()
					},
					title: this.currentTitle,
					icon: "search"
				});
				// Enable the arrow highlight on the back arrow because there's now back history.
				this.headerEl.children[1].children[0].setAttribute("aria-disabled", "false");
			}
		}

		// Support both http:// and https://
		// TODO: ?Should we support Localhost?
		// And the before one is : /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi; which will only match `blabla.blabla`
		// Support 192.168.0.1 for some local software server, and localhost
		const urlRegEx = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#?&/=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/= ]*)$/g;
		if (urlRegEx.test(url)) {
			const first7 = url.slice(0, 7).toLowerCase();
			const first8 = url.slice(0, 8).toLowerCase();
			if (!(first7 === "http://" || first7 === "file://" || first8 === "https://")) {
				url = "https://" + url;
			}
		} else if (!(url.slice(0, 7) === "file://") || !(/\.htm(l)?$/g.test(url))) {
			// If url is not a valid FILE url, search it with search engine.
			// TODO: Support other search engines.
			// url = "https://duckduckgo.com/?q=" + url;
			console.warn(url + ' is not a real url, searching the Fandom now...');
			url = "https://forgottenrealms.fandom.com/wiki/Special:Search?query=" + url;
		}

		this.currentUrl = url;
		this.headerBar.setSearchBarUrl(url);
		if (updateWebView) {
			this.frame.setAttribute("src", url);
		}
		app.workspace.requestSaveLayout();
	}
}

class WebBrowserViewState {
	url: string;
}

export function registerWebBrowserView(this: DnDPlugin) {
	this.registerView(WEB_BROWSER_VIEW_ID, (leaf) => new WebBrowserView(leaf));
}
