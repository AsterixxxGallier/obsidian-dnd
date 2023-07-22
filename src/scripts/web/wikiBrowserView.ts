// CREDITS: https://github.com/Trikzon/obsidian-web-browser/blob/main/src/web_browser_view.ts

import DnDPlugin from '../main';

import {EventRef, ItemView, MarkdownView, Menu, ViewStateResult, WorkspaceLeaf} from 'obsidian';
import {SearchHeaderBar} from './searchHeaderBar';
import {EditorView} from "@codemirror/view";
import {syntaxTree} from "@codemirror/language";
import {SyntaxNodeRef} from "@lezer/common";
import {data, getScript, Website} from "../data";
import {WebBrowserView} from "./webBrowserView";

export const WIKI_BROWSER_VIEW_ID = 'wiki-browser-view';

export class WikiBrowserView extends ItemView {
	private currentWiki: string;
	private currentPage: string;
	private currentTitle: string = 'New tab';

	private headerBar: SearchHeaderBar;
	private favicon: HTMLImageElement;
	private frame: HTMLIFrameElement;

	private tracking: boolean;
	private layoutChangeEventRef: EventRef | null = null;
	private activeLeafChangeEventRef: EventRef | null = null;

	static async spawnWikiBrowserView(newLeaf: boolean, state: WikiBrowserViewState) {
		const leaf = app.workspace.getLeaf(newLeaf);
		await this.spawnWikiBrowserViewInLeaf(leaf, state);
	}

	static async spawnWikiBrowserViewInLeaf(leaf: WorkspaceLeaf, state: WikiBrowserViewState) {
		await leaf.setViewState({type: WIKI_BROWSER_VIEW_ID, active: true, state});
	}

	get wiki(): Website | undefined {
		return data.websites[this.currentWiki]
	}

	getShortTitle(): string {
		const pattern = this.wiki?.titlePattern;
		if (pattern == null) {
			return this.currentTitle;
		}
		return this.currentTitle.match(new RegExp(pattern))?.at(1) ?? this.currentTitle;
	}

	getDisplayText(): string {
		// return "Display text";
		return this.getShortTitle();
	}

	getViewType(): string {
		return WIKI_BROWSER_VIEW_ID;
	}

	onPaneMenu(menu: Menu, source: "more-options" | "tab-header" | string) {
		super.onPaneMenu(menu, source);
		menu.addItem((item) =>
			item
				.setSection('pane')
				.setIcon('footprints')
				.setTitle('Track the active file with this website')
				.setChecked(this.tracking)
				.onClick(async () => {
					if (this.tracking) {
						this.stopTracking();
					} else {
						await this.startTracking();
					}
				})
		);
		const file = app.workspace.getActiveFile();
		if (file !== null) {
			const fandom = app.metadataCache.getFileCache(file)?.frontmatter?.['fandom'];
			if (!fandom) {
				const view = app.workspace
					.getLeavesOfType('markdown')
					.map(leaf => <MarkdownView>leaf.view)
					.find(view => view.file == file);
				if (view !== undefined) {
					menu.addItem((item) =>
						item
							.setSection('pane')
							.setIcon('link')
							.setTitle('Associate the active file with this website')
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
								const page = this.currentPage;
								const key = this.wiki!.shortName;
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
			}
		}
	}

	private async startTracking() {
		this.tracking = true;
		this.layoutChangeEventRef = app.workspace.on('layout-change', async () => await this.track());
		this.activeLeafChangeEventRef = app.workspace.on('active-leaf-change', async () => await this.track());
		await this.track();
	}

	private stopTracking() {
		this.tracking = false;
		app.workspace.offref(this.layoutChangeEventRef!);
		app.workspace.offref(this.activeLeafChangeEventRef!);
	}

	protected onClose() {
		if (this.tracking) {
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
		let page = metadata.frontmatter?.[this.wiki!.shortName];
		// if (page == undefined) {
		// 	console.warn("Could not track with web view because the active file's frontmatter does not contain 'fandom' property");
		// 	return;
		// }
		if (page == undefined) {
			if (this.wiki!.searchPrefix != undefined) {
				page = this.wiki!.searchPrefix + encodeURIComponent(file.basename);
			} else {
				await WebBrowserView.spawnWebBrowserViewInLeaf(this.leaf, {
					url: this.wiki!.externalSearchPrefix + encodeURIComponent(file.basename),
					// TODO this should be a view that tracks the active file as well, and its header bar should search the wiki
					//  => it needs to be a wiki browser view with a non-wiki url
				});
			}
		}
		if (this.currentPage != page) {
			await this.setState({wiki: this.currentWiki, page, tracking: true}, {});
		}
	}

	async onOpen() {
		// Allow views to replace this view.
		this.navigation = true;

		this.contentEl.empty();

		// Create search bar in the header bar.
		this.headerBar = new SearchHeaderBar(this.headerEl.children[2], 'Search ' + (this.wiki?.longName ?? 'the wiki'));

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

		this.headerBar.addOnSearchBarEnterListener(async (input: string) => {
			if (this.wiki!.searchPrefix != undefined) {
				await this.navigate(this.wiki!.searchPrefix + encodeURIComponent(input));
			} else {
				await WebBrowserView.spawnWebBrowserView(false, {
					url: this.wiki!.externalSearchPrefix + encodeURIComponent(input)
				});
			}
		});

		this.frame.addEventListener("dom-ready", () => {
			const {remote} = require('electron');
			// @ts-ignore
			const webContents = remote.webContents.fromId(this.frame.getWebContentsId());
			// console.log('webContents:', webContents);
			// webContents.on('console-message', (event: any, level: string, message: string) => {
			// 	console.log('WebView console message (level ' + level + '): \n' + message);
			// });
			webContents.executeJavaScript(getScript(webContents.getURL()));

			// Open new browser tab if the web view requests it.
			webContents.setWindowOpenHandler(async (event: any) => {
				const url: string = event.url;
				const prefix = this.wiki!.basePrefix;
				if (url.startsWith(prefix)) {
					await WikiBrowserView.spawnWikiBrowserView(true, {
						wiki: this.currentWiki,
						page: url.substring(prefix.length),
						tracking: false
					});
				} else {
					await WebBrowserView.spawnWebBrowserView(true, {url});
				}
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
			this.currentTitle = event.title;
			this.leaf.tabHeaderInnerTitleEl.innerText = this.getShortTitle();
		});

		this.frame.addEventListener("will-navigate", async (event: any) => {
			const url: string = event.url;
			const prefix = this.wiki!.basePrefix;
			if (url.startsWith(prefix)) {
				await this.navigate(url.substring(prefix.length), true, false);
			} else {
				await WebBrowserView.spawnWebBrowserView(true, {url});
			}
		});

		this.frame.addEventListener("did-navigate-in-page", async (event: any) => {
			const url: string = event.url;
			const prefix = this.wiki!.basePrefix;
			if (url.startsWith(prefix)) {
				await this.navigate(url.substring(prefix.length), true, false);
			} else {
				await WebBrowserView.spawnWebBrowserView(true, {url});
			}
		});

		this.frame.addEventListener("new-window", (event: any) => {
			console.log("Trying to open new window at url: " + event.url);
			event.preventDefault();
		});
	}

	async setState(state: WikiBrowserViewState, result: ViewStateResult) {
		this.currentWiki = state.wiki;
		this.headerBar.setSearchBarPlaceholder('Search ' + this.wiki!.longName);
		await this.navigate(state.page, false, true, true);
		if (this.tracking && !state.tracking) {
			this.stopTracking();
		} else if (!this.tracking && state.tracking) {
			await this.startTracking();
		}
	}

	getState(): WikiBrowserViewState {
		return {wiki: this.currentWiki, page: this.currentPage, tracking: this.tracking};
	}

	async navigate(
		page: string,
		addToHistory: boolean = true,
		updateWebView: boolean = true,
		alwaysInThisLeaf: boolean = false,
	) {
		if (page === "") {
			return;
		}

		if (this.tracking && !alwaysInThisLeaf) {
			await WikiBrowserView.spawnWikiBrowserView(true, {
				wiki: this.currentWiki,
				page: page,
				tracking: false,
			});
			return;
		}

		if (addToHistory) {
			if (this.leaf.history.backHistory.last()?.state?.state?.page !== this.currentPage) {
				this.leaf.history.backHistory.push({
					state: {
						type: WIKI_BROWSER_VIEW_ID,
						state: this.getState()
					},
					title: this.currentTitle,
					icon: "search"
				});
				// Enable the arrow highlight on the back arrow because there's now back history.
				this.headerEl.children[1].children[0].setAttribute("aria-disabled", "false");
			}
		}

		this.currentPage = page;
		this.currentTitle = page;
		this.headerBar.setSearchBarURL(page);
		if (updateWebView) {
			this.frame.setAttribute("src", this.wiki!.basePrefix + page);
		}
		app.workspace.requestSaveLayout();
	}
}

class WikiBrowserViewState {
	wiki: string;
	page: string;
	tracking: boolean;
}

export function registerWikiBrowserView(this: DnDPlugin) {
	this.registerView(WIKI_BROWSER_VIEW_ID, (leaf) => new WikiBrowserView(leaf));
}
