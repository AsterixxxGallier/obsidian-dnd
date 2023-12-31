// CREDITS: https://github.com/Trikzon/obsidian-web-browser/blob/main/src/hooks.ts

import { WebBrowserView } from './webBrowserView';

let ogWindow$Open: (url?: string | URL, target?: string, features?: string) => WindowProxy | null;

// TODO: Change this whole thing to use https://github.com/pjeby/monkey-around instead.
export function addOpenFunctionHook() {
	ogWindow$Open = window.open;
	window.open = (url?: string | URL, target?: string, features?: string): WindowProxy | null => {
		// TODO: Create setting for whether to open external links outside of Obsidian or not.
		// return ogWindow$Open.call(window, url, target, features);

		let urlString: string = "";
		if (typeof url === "string") {
			urlString = url;
		} else if (url instanceof URL) {
			urlString = url.toString();
		}

		// 1. Allows Obsidian to open a popup window if url is "about:blank" and features is not null
		// TODO: There might be a better way to detect if it's a popup window.
		// 2. Perform default behavior if the url isn't "http://" or "https://"
		// TODO: Change to `isWebUri()` when I change to use the valid-url library.
		if ((urlString === "about:blank" && features) || (!urlString.startsWith("http://") && !urlString.startsWith("https://") && !urlString.startsWith("file://"))) {
			return ogWindow$Open.call(window, url, target, features);
		}

		// TODO: Open external link in current leaf when meta key isn't being held down.
		WebBrowserView.spawnWebBrowserView(true, {url: urlString, trackingWikiID: null}).then(() => {});
		return null;
	}
}

export function removeOpenFunctionHook() {
	window.open = ogWindow$Open;
}
