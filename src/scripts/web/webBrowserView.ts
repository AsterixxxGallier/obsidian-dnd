// CREDITS: https://github.com/Trikzon/obsidian-web-browser/blob/main/src/web_browser_view.ts

import DnDPlugin from '../main';

import {EventRef, ItemView, MarkdownView, Menu, ViewStateResult, WorkspaceLeaf} from 'obsidian';
import {SearchHeaderBar} from './searchHeaderBar';
import {data, getScript, WebsiteDisplayInformation, Wiki} from "../data";
// import {WikiBrowserView} from "./wikiBrowserView";
import {EditorView} from "@codemirror/view";
import {syntaxTree} from "@codemirror/language";
import {SyntaxNodeRef} from "@lezer/common";

export const WEB_BROWSER_VIEW_ID = 'web-browser-view';

export class WebBrowserView extends ItemView {
	private currentURL: string;
	private currentTitle: string = 'New tab';
	private currentWebsiteDisplayInformation: WebsiteDisplayInformation | null = null;

	private headerBar: SearchHeaderBar;
	private favicon: HTMLImageElement;
	private frame: HTMLIFrameElement;

    private trackingWikiID: string | null = null;
    private layoutChangeEventRef: EventRef | null = null;
    private activeLeafChangeEventRef: EventRef | null = null;

	static async spawnWebBrowserView(newLeaf: boolean, state: WebBrowserViewState) {
		const leaf = app.workspace.getLeaf(newLeaf);
		await this.spawnWebBrowserViewInLeaf(leaf, state);
	}

	static async spawnWebBrowserViewInLeaf(leaf: WorkspaceLeaf, state: WebBrowserViewState) {
		await leaf.setViewState({type: WEB_BROWSER_VIEW_ID, active: true, state});
	}

	get trackingWiki(): Wiki | undefined {
		return data.wikis.find(wiki => wiki.id == this.trackingWikiID);
	}

	get displayTitle(): string {
		const pattern = this.currentWebsiteDisplayInformation?.titlePattern;
		if (pattern == null) {
			return this.currentTitle
		}
		return this.currentTitle.match(new RegExp(pattern))?.at(1) ?? this.currentTitle;
	}

	getDisplayText(): string {
		return this.displayTitle;
	}

	getViewType(): string {
		return WEB_BROWSER_VIEW_ID;
	}

	onPaneMenu(menu: Menu, source: "more-options" | "tab-header" | string) {
		super.onPaneMenu(menu, source);
		for (const wiki of data.wikis) {
			menu.addItem((item) =>
				item
					.setSection('pane')
					.setIcon('footprints')
					.setTitle('Track the active file on ' + wiki.displayName)
					.setChecked(this.trackingWikiID == wiki.id)
					.onClick(async () => {
						if (this.trackingWikiID != null) {
							this.stopTracking();
						}
						await this.startTracking(wiki.id);
					})
			);
		}

		const file = app.workspace.getActiveFile();
		if (file === null) return;

		const wiki = data.wikis.find(wiki => this.currentURL.startsWith(wiki.pagePrefix));
		if (wiki === undefined) return;

		const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
		if (frontmatter?.[wiki.id] !== undefined) return;

		const view = app.workspace
			.getLeavesOfType('markdown')
			.map(leaf => <MarkdownView>leaf.view)
			.find(view => view.file == file);
		if (view === undefined) return;

		menu.addItem((item) =>
			item
				.setSection('pane')
				.setIcon('link')
				.setTitle('Associate the active file with this page on ' + wiki.displayName)
				.onClick(() => {
					// const content = view.editor.getValue();
					// @ts-ignore
					const editorView = <EditorView>view.editor.cm;
					let beforeFrontmatterEnd: number | undefined = undefined;
					let frontmatterOpened = false;
					syntaxTree(editorView.state).iterate({
						enter(node: SyntaxNodeRef): boolean | void {
							if (node.type.name === 'def_hmd-frontmatter') {
								if (frontmatterOpened) {
									beforeFrontmatterEnd = node.from;
								} else {
									frontmatterOpened = true;
								}
							}
						}
					});
					const page = this.currentURL.substring(wiki.pagePrefix.length);
					const key = wiki.id;
					let text;
					let pos;
					if (beforeFrontmatterEnd == undefined) {
						// create frontmatter
						text = `---\n${key}: ${page}\n---\n\n`;
						pos = {line: 0, ch: 0};
					} else {
						// amend existing frontmatter
						text = `${key}: ${page}\n`;
						const line = editorView.state.doc.lineAt(beforeFrontmatterEnd);
						pos = {line: line.number - 1, ch: beforeFrontmatterEnd - line.from};
					}
					view.editor.replaceRange(text, pos);
					// view.editor.setCursor(pos);
					// view.editor.replaceSelection(amendment);
					// view.editor.setSelection(view.editor.getCursor('anchor'), pos);
					// view.editor.focus();
				})
		);
	}

	private async startTracking(wiki: string) {
		this.trackingWikiID = wiki;
		this.layoutChangeEventRef = app.workspace.on('layout-change', async () => await this.track());
		this.activeLeafChangeEventRef = app.workspace.on('active-leaf-change', async () => await this.track());
		await this.track();
	}

	private stopTracking() {
		this.trackingWikiID = null;
		app.workspace.offref(this.layoutChangeEventRef!);
		app.workspace.offref(this.activeLeafChangeEventRef!);
	}

	protected onClose() {
		if (this.trackingWikiID != null) {
			this.stopTracking();
		}
		return super.onClose();
	}

	private async track() {
		const file = app.workspace.getActiveFile();
		if (file == null) {
			console.warn('Could not track with web view because the active file is null');
			return;
		}
		const metadata = app.metadataCache.getFileCache(file);
		if (metadata == null) {
			console.warn("Could not track with web view because the active file's cached metadata is null");
			return;
		}
		let page = metadata.frontmatter?.[this.trackingWiki!.id];
		// if (page == undefined) {
		// 	console.warn("Could not track with web view because the active file's frontmatter does not contain 'fandom' property");
		// 	return;
		// }
		if (page == undefined) {
			// if the active file is not associated with a page on this wiki, then do nothing
			return
		}
		await this.navigate(this.trackingWiki!.pagePrefix + <string>page);
	}

	async onOpen() {
		// Allow views to replace this view.
		this.navigation = true;

		this.contentEl.empty();

		// Create search bar in the header bar.
		this.headerBar = new SearchHeaderBar(this.headerEl.children[2]);
		this.headerBar.addDefaultOnSearchBarEnterListener();

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
				await WebBrowserView.spawnWebBrowserView(true, {url: event.url, trackingWikiID: null});
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
		if (this.trackingWikiID != null) {
			this.stopTracking();
		}
		if (state.trackingWikiID != null) {
			await this.startTracking(state.trackingWikiID);
		}
	}

	getState(): WebBrowserViewState {
		return {url: this.currentURL, trackingWikiID: this.trackingWikiID};
	}

	async navigate(url: string, addToHistory: boolean = true, updateWebView: boolean = true) {
		if (url === "" || url == this.currentURL) {
			return;
		}

		if (addToHistory) {
			if (this.leaf.history.backHistory.last()?.state?.state?.url !== this.currentURL) {
				this.leaf.history.backHistory.push({
					state: {
						type: WEB_BROWSER_VIEW_ID,
						state: this.getState()
					},
					title: this.displayTitle,
					icon: "search"
				});
				// Enable the arrow highlight on the back arrow because there's now back history.
				this.headerEl.children[1].children[0].setAttribute("aria-disabled", "false");
			}
		}

		const newInfo = data.websiteDisplayInformation.find(info => new RegExp(info.urlPattern).test(url));
		if (newInfo != undefined) {
			this.currentWebsiteDisplayInformation = newInfo;
		} else {
			this.currentWebsiteDisplayInformation = null;
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
	trackingWikiID: string | null;
}

export function registerWebBrowserView(this: DnDPlugin) {
	this.registerView(WEB_BROWSER_VIEW_ID, (leaf) => new WebBrowserView(leaf));
}
