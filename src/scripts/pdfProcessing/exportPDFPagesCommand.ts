import DnDPlugin from "../main";
import {loadPdfJs, moment} from "obsidian";
import {PDFDocumentProxy} from "pdfjs-dist";
import {data} from "../data";

export function registerExportPDFPagesCommand(this: DnDPlugin) {
	this.addCommand({
		id: 'export-pdf',
		name: 'Export pages of PDF file as images',
		callback: async () => {
			const startTime = moment.now();

			const file = app.workspace.getActiveFile()!;
			const buffer = await app.vault.readBinary(file);
			const pdfJs = await loadPdfJs();
			const doc: PDFDocumentProxy = await pdfJs.getDocument(buffer).promise;
			console.log(doc);

			const directoryPath = data.settings.pdfPageExportDirectoryPath + "/" + file.basename;
			await this.app.vault.createFolder(directoryPath);

			for (let number = 1; number <= doc.numPages; number++) {
				console.log(` --- STARTING PAGE ${number} / ${doc.numPages} AFTER ${(moment.now() - startTime) / 1000}s --- `);

				const pdfPage = await doc.getPage(number);
				const viewport = pdfPage.getViewport({scale: 4});
				const canvas = document.createElement("canvas");
				canvas.height = viewport.height;
				canvas.width = viewport.width;
				pdfPage.render({
					canvasContext: canvas.getContext("2d")!,
					viewport: viewport,
				}).promise.then(() => {
					canvas.toBlob(async (blob) => {
						await this.app.vault.adapter.writeBinary(
							`${directoryPath}/${number.toString().padStart(3, '0')}.png`,
							await blob!.arrayBuffer(),
						);
						console.log(` --- FINISHED PAGE ${number} / ${doc.numPages} AFTER ${(moment.now() - startTime) / 1000}s ---`)
					}, 'image/png', 0.9)
				});
			}
		}
	});
}
