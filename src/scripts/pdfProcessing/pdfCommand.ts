import DnDPlugin from "../main";
import {loadPdfJs} from "obsidian";
import {PDFDocumentProxy, PDFPageProxy} from "pdfjs-dist";
import {TextItem} from "pdfjs-dist/types/src/display/api";

export function registerPDFCommand(this: DnDPlugin) {
	this.addCommand({
		id: "pdf-command",
		name: "Log PDF text",
		// editorCallback: async (editor: Editor, _view: MarkdownView) => {
		callback: async () => {
			const file = app.workspace.getActiveFile();
			const buffer = await app.vault.readBinary(file!);
			const pdfJs = await loadPdfJs();
			const doc: PDFDocumentProxy = await pdfJs.getDocument(buffer).promise;
			console.log(doc);
			const pages: PDFPageProxy[] = [];
			for (let num = 1; num <= doc.numPages; num++) {
				pages.push(await doc.getPage(num));
			}
			let text = "";
			for (let page of pages) {
				const textContent = await page.getTextContent();
				for (let item of textContent.items) {
					const line = <TextItem>item;
					text += line.str;
					if (line.hasEOL) text += "\n";
					else text += " ";
				}
			}
			console.log(text);
		},
	});
}
