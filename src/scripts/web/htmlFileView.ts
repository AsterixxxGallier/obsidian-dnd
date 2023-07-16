// CREDITS: https://github.com/Trikzon/obsidian-web-browser/blob/main/src/web_browser_file_view.ts

import {FileSystemAdapter, FileView, Notice, TFile, WorkspaceLeaf} from 'obsidian';
import {WebBrowserView} from './webBrowserView';
import DnDPlugin from "../main";

export const HTML_FILE_EXTENSIONS = ['html', 'htm'];
export const HTML_FILE_VIEW_ID = 'html-file-view';

export class HTMLFileView extends FileView {
	allowNoFile: false;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	async onLoadFile(file: TFile): Promise<void> {
		const adapter = this.app.vault.adapter as FileSystemAdapter;
		const urlString = 'file:///' + (adapter.getBasePath() + '/' + file.path).toString().replace(/\s/g, '%20');
		await WebBrowserView.spawnWebBrowserView(true, {url: urlString});
		if (this.leaf) this.leaf.detach();
	}

	onunload(): void {
	}

	canAcceptExtension(extension: string) {
		return HTML_FILE_EXTENSIONS.includes(extension);
	}

	getViewType() {
		return HTML_FILE_VIEW_ID;
	}
}

export function registerHTMLFileView(this: DnDPlugin) {
	this.registerView(HTML_FILE_VIEW_ID, (leaf) => new HTMLFileView(leaf));
}

export function registerHTMLFileExtensions(this: DnDPlugin) {
	try {
		this.registerExtensions(HTML_FILE_EXTENSIONS, HTML_FILE_VIEW_ID);
	} catch (error) {
		new Notice(`File extensions ${HTML_FILE_EXTENSIONS} had been registered by other plugin!`);
	}
}
