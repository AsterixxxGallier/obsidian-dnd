// CREDITS: https://github.com/Trikzon/obsidian-web-browser/blob/main/src/header_bar.ts

import DnDPlugin from "../main";
import {ItemView} from "obsidian";
import {WebBrowserView} from "./webBrowserView";
import {data} from "../data";

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
        this.searchBar.placeholder = "Search or enter address";
        this.searchBar.addClass("web-browser-search-bar");
        parent.appendChild(this.searchBar);

        this.searchBar.addEventListener("keydown", (event: KeyboardEvent) => {
            if (!event) {
                event = window.event as KeyboardEvent;
            }
            if (event.key === "Enter") {
                for (const listener of this.onSearchBarEnterListener) {
                    listener(this.searchBar.value);
                }
            }
        }, false);
    }

    addDefaultOnSearchBarEnterListener() {
        this.addOnSearchBarEnterListener(async (input: string) => {
            for (const searchEngine of data.searchEngines) {
                if (input.startsWith(searchEngine.id + ':')) {
                    await WebBrowserView.spawnWebBrowserView(false, {
                        url: searchEngine.searchPrefix + input.substring(searchEngine.id.length + 1).trim(),
                        trackingWikiID: null,
                    });
                    return;
                }
            }
            let url = input;
            // Support both http:// and https://
            // TODO: ?Should we support Localhost?
            // And the before one is : /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi; which will only match `blabla.blabla`
            // Support 192.168.0.1 for some local software server, and localhost
            const urlRegEx = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#?&/=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=']*)$/g;
            if (urlRegEx.test(input)) {
                const first7 = input.slice(0, 7).toLowerCase();
                const first8 = input.slice(0, 8).toLowerCase();
                if (!(first7 === "http://" || first7 === "file://" || first8 === "https://")) {
                    url = "https://" + input;
                }
            } else if (!(input.slice(0, 7) === "file://") || !(/\.htm(l)?$/g.test(input))) {
                // If input is not a valid FILE url, search it with search engine.
                // TODO: Support other search engines.
                url = "https://duckduckgo.com/?q=" + encodeURIComponent(input);
            }
            await WebBrowserView.spawnWebBrowserView(false, {url, trackingWikiID: null});
        });
    }

    addOnSearchBarEnterListener(listener: (url: string) => void) {
        this.onSearchBarEnterListener.push(listener);
    }

    setSearchBarURL(url: string) {
        this.searchBar.value = url;
    }

    setSearchBarPlaceholder(text: string) {
        this.searchBar.placeholder = text;
    }

    focus() {
        this.searchBar.focus();
    }
}

export function addSearchHeaderBarToNewTabView(this: DnDPlugin) {
    this.registerEvent(this.app.workspace.on("layout-change", () => {
        const activeView = this.app.workspace.getActiveViewOfType(ItemView);
        if (activeView == null) return;
        // Check if the view is a "New tab" view. I don't think this class is used elsewhere. I sure hope not.
        if (!activeView.contentEl.children[0].hasClass("empty-state")) return;
        // Check if the "New tab" view has already been processed and has a header bar already.
        if (activeView.headerEl.children[2].hasClass("web-browser-header-bar")) return;
        const headerBar = new SearchHeaderBar(activeView.headerEl.children[2]);
        // Focus on current inputEl
        headerBar.focus();
        headerBar.addDefaultOnSearchBarEnterListener();
    }));
}
