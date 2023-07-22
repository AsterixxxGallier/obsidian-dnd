import DnDPlugin from '../main';
import * as adBlock from 'ad-block-js';

export async function startAdBlocker(this: DnDPlugin) {
	const client = adBlock.create();

	const lists = await Promise.all([
		'easylist.txt',
		'easyprivacy.txt',
		'fanboy-cookiemonster.txt',
	].map(file => this.app.vault.adapter.read(
		this.app.vault.configDir + '/plugins/obsidian-dnd/adBlockLists/' + file)));

	for (const list of lists) {
		list.split(/\r?\n/).forEach(function (rule) {
			client.add(rule);
		});
	}

	this.app.workspace.onLayoutReady(async () => {
		const {remote} = require('electron');

		// @ts-ignore
		remote.session.defaultSession.webRequest.onBeforeRequest({urls: ['*://*/*']}, (details, cb) => {
			const cancel = client.matches(details.url);
			// if (cancel) console.log('BLOCKED ', details.url);
			// else console.log('ALLOWED ', details.url);
			cb({cancel});
		});
	});
}
