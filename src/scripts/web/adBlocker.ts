import DnDPlugin from '../main';
import * as adBlock from 'ad-block-js';
import {Notice} from "obsidian";

// FIXME doesn't work (fails to catch any request)
export async function startAdBlocker(this: DnDPlugin) {
	// console.log("==== STARTING AD BLOCKER ====")

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

		// console.log("READYING AD BLOCKER")

		// @ts-ignore
		// console.log(remote)
		// @ts-ignore
		// console.log(remote.session)
		// @ts-ignore
		// console.log(remote.session.defaultSession)
		// @ts-ignore
		// console.log(remote.session.defaultSession.webRequest)
		// @ts-ignore
		// alternative pattern: '<all_urls>'
		remote.session.defaultSession.webRequest.onBeforeRequest({urls: ['*://*/*']}, (details, cb) => {
		// remote.session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
			console.log("CAUGHT REQUEST")
			new Notice("CAUGHT REQUEST!", 0);
			const cancel = client.matches(details.url);
			if (cancel) console.log('BLOCKED ', details.url);
			else console.log('ALLOWED ', details.url);
			cb({cancel});
		});
	});
}
