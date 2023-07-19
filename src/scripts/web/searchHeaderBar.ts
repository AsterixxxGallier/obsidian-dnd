// CREDITS: https://github.com/Trikzon/obsidian-web-browser/blob/main/src/header_bar.ts

import DnDPlugin from "../main";
import {ItemView} from "obsidian";
import {WebBrowserView} from "./webBrowserView";

export class SearchHeaderBar {
	private searchBar: HTMLInputElement;
	private onSearchBarEnterListener = new Array<(url: string) => void>;

	constructor(parent: Element) {
		// CSS class removes the gradient at the right of the header bar.
		parent.addClass("web-browser-header-bar");
		// Remove default title from header bar.
		parent.removeChild(parent.children[1]);

		// Create search bar in header bar.
		this.searchBar = document.createElement("input");
		this.searchBar.type = "text";
		this.searchBar.placeholder = "Search on the Forgotten Realms Fandom or enter address"
		this.searchBar.addClass("web-browser-search-bar");
		parent.appendChild(this.searchBar);

		this.searchBar.addEventListener("keydown", (event: KeyboardEvent) => {
			if (!event) { event = window.event as KeyboardEvent; }
			if (event.key === "Enter") {
				for (const listener of this.onSearchBarEnterListener) {
					listener(this.searchBar.value);
				}
			}
		}, false);
	}

	addOnSearchBarEnterListener(listener: (url: string) => void) {
		this.onSearchBarEnterListener.push(listener);
	}

	setSearchBarUrl(url: string) {
		const start = 'https://forgottenrealms.fandom.com/wiki/';
		if (url.startsWith(start)) {
			url = url.substring(start.length);
		}
		this.searchBar.value = decodeURIComponent(url);
	}

	focus() {
		this.searchBar.focus();
	}
}

export function addSearchHeaderBarToNewTabView(this: DnDPlugin) {
	this.registerEvent(this.app.workspace.on("layout-change", () => {
		const activeView = this.app.workspace.getActiveViewOfType(ItemView);
		if (activeView) {
			// Check if the view is a "New tab" view. I don't think this class is used elsewhere. I sure hope not.
			if (activeView.contentEl.children[0].hasClass("empty-state")) {
				// Check if the "New tab" view has already been processed and has a header bar already.
				if (!activeView.headerEl.children[2].hasClass("web-browser-header-bar")) {
					const headerBar = new SearchHeaderBar(activeView.headerEl.children[2]);
					// Focus on current inputEl
					headerBar.focus();
					headerBar.addOnSearchBarEnterListener(async (url: string) => {
						await WebBrowserView.spawnWebBrowserView(false, {url, tracking: false});
					});
				}
			}
		}
	}));
}
