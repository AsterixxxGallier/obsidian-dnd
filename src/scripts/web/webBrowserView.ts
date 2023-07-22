// CREDITS: https://github.com/Trikzon/obsidian-web-browser/blob/main/src/web_browser_view.ts

import DnDPlugin from '../main';

import {ItemView, ViewStateResult, WorkspaceLeaf} from 'obsidian';
import {SearchHeaderBar} from './searchHeaderBar';
import {data, getScript} from "../data";
import {WikiBrowserView} from "./wikiBrowserView";

export const WEB_BROWSER_VIEW_ID = 'web-browser-view';

export class WebBrowserView extends ItemView {
	private currentURL: string;
	private currentTitle: string = 'New tab';

	private headerBar: SearchHeaderBar;
	private favicon: HTMLImageElement;
	private frame: HTMLIFrameElement;

	static async spawnWebBrowserView(newLeaf: boolean, state: WebBrowserViewState) {
		const leaf = app.workspace.getLeaf(newLeaf);
		await this.spawnWebBrowserViewInLeaf(leaf, state);
	}

	static async spawnWebBrowserViewInLeaf(leaf: WorkspaceLeaf, state: WebBrowserViewState) {
		await leaf.setViewState({type: WEB_BROWSER_VIEW_ID, active: true, state});
	}

	getDisplayText(): string {
		return this.currentTitle;
	}

	getViewType(): string {
		return WEB_BROWSER_VIEW_ID;
	}

	async onOpen() {
		// Allow views to replace this view.
		this.navigation = true;

		this.contentEl.empty();

		// Create search bar in the header bar.
		this.headerBar = new SearchHeaderBar(this.headerEl.children[2], 'Search or enter address');

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

		this.headerBar.addOnSearchBarEnterListener(async (url: string) => {
			await this.navigate(encodeURIComponent(url));
		});

		this.frame.addEventListener("dom-ready", () => {
			const {remote} = require('electron');
			// @ts-ignore
			const webContents = remote.webContents.fromId(this.frame.getWebContentsId());
			// console.log('webContents:', webContents);
			// webContents.on('console-message', (event, level, message) => {
			// 	console.log('WebView console message (level ' + level + '): \n' + message);
			// });
			webContents.executeJavaScript(getScript(webContents.getURL()));

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
			this.leaf.tabHeaderInnerTitleEl.innerText = event.title;
			this.currentTitle = event.title;
		});

		this.frame.addEventListener("will-navigate", async (event: any) => {
			await this.navigate(event.url, true, false);
		});

		this.frame.addEventListener("did-navigate-in-page", async (event: any) => {
			await this.navigate(event.url, true, false);
		});

		this.frame.addEventListener("new-window", (event: any) => {
			console.log("Trying to open new window at url: " + event.url);
			event.preventDefault();
		});
	}

	async setState(state: WebBrowserViewState, result: ViewStateResult) {
		await this.navigate(state.url, false);
	}

	getState(): WebBrowserViewState {
		return {url: this.currentURL};
	}

	async navigate(url: string, addToHistory: boolean = true, updateWebView: boolean = true) {
		if (url === "") {
			return;
		}

		if (addToHistory) {
			if (this.leaf.history.backHistory.last()?.state?.state?.url !== this.currentURL) {
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

		for (const [id, wiki] of Object.entries(data.websites)) {
			if (url.startsWith(wiki.basePrefix)) {
				await WikiBrowserView.spawnWikiBrowserViewInLeaf(this.leaf, {
					wiki: id,
					page: url.substring(wiki.basePrefix.length),
					tracking: false,
				});
				return;
			}
		}

		this.currentURL = url;
		this.headerBar.setSearchBarURL(url);
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
