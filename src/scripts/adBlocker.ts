import DnDPlugin from "./main";

export function startAdBlocker(this: DnDPlugin) {
	this.app.workspace.onLayoutReady(async () => {
		const {remote} = require('electron');

		// @ts-ignore
		remote.session.defaultSession.webRequest.onBeforeRequest({urls: ['*://*/*']}, (details, cb) => {
			// console.log('url:', details.url);
			const is_ok = /forgottenrealms\.fandom\.com|wikia\.nocookie\.net|obsidian\.md|githubusercontent\.com|github\.com|jsdelivr\.net/;
			cb({cancel: !is_ok.test(details.url)});
		});
	});
}
