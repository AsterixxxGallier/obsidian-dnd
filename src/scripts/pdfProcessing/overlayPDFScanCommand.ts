import DnDPlugin from "../main";
import {Menu, Notice, TFile, View} from "obsidian";
import {moveBoundingBox, RelativeBoundingBox} from "./hocrImport";
import {PDFPageView} from "pdfjs-dist/types/web/pdf_page_view";
import {scannedPDFs} from "../data";

export function registerOverlayPDFScanCommand(this: DnDPlugin) {
	const plugin = this;
	this.addCommand({
		id: "overlay-pdf-scan",
		name: "Overlay PDF Scan",
		callback: async () => {
			// pdfjsViewer is an undeclared global and this somehow works
			// @ts-ignore
			const view = <View | null>this.app.workspace.getActiveViewOfType(pdfjsViewer.constructor);
			if (view === null) {
				console.warn('no pdfjsViewer currently active');
				return;
			}

			console.log(view);

			// file is an undeclared property
			// @ts-ignore
			const pdfPath = (<TFile>view.file).path;

			if (!(pdfPath in scannedPDFs)) {
				console.warn('no scan data available for ' + pdfPath);
				return;
			}

			const document = scannedPDFs[pdfPath];
			console.log(scannedPDFs);

			function overlayPage(pageEl: HTMLElement, width: number, height: number) {
				pageEl.querySelectorAll('.textLayer,.annotationLayer,.annotationEditorLayer,.ocr-layer')
					.forEach((element) => element.remove());

				const layer = pageEl.createDiv({cls: 'ocr-layer'});
				plugin.register(() => layer.remove());

				layer.style.width = pageEl.style.width;
				layer.style.height = pageEl.style.height;
				layer.style.zIndex = '2';

				function position(element: HTMLElement, boundingBox: RelativeBoundingBox) {
					const scale = (n: number) => `calc(var(--scale-factor) * ${n}px)`;
					// parseFloat ignores the trailing 'px'
					element.style.left = scale(boundingBox.left * width);
					element.style.top = scale(boundingBox.top * height);
					element.style.width = scale((boundingBox.right - boundingBox.left) * width);
					element.style.height = scale((boundingBox.bottom - boundingBox.top) * height);
				}

				const number = pageEl.dataset.pageNumber!;
				console.log(pageEl.dataset.pageNumber);
				const index = parseInt(number) - 1;
				const page = document.pages[index];
				console.log(page);
				for (const area of page.areas) {
					for (const paragraph of area.paragraphs) {
						const paragraphEl = layer.createEl('div', {cls: 'paragraph-box'});
						const text = paragraph.lines.map(line => line.words.map(word => word.text).join(" ")).join("\n");
						paragraphEl.onclick = () => {
							console.log("clicked!");
							const {clipboard} = require('electron');
							clipboard.writeText(text);
						};
						paragraphEl.title = text;
						position(paragraphEl, paragraph.boundingBox);
						for (const line of paragraph.lines) {
							for (const word of line.words) {
								const confidenceClass =
									word.confirmed ? 'confirmed' :
										word.confidence < 20 ? 'extremely-low-confidence' :
											word.confidence < 60 ? 'low-confidence' :
												word.confidence < 80 ? 'moderate-confidence' :
													'high-confidence'
								const wordEl = paragraphEl.createEl('div', {cls: ['word-box', confidenceClass]});
								wordEl.title = word.confidence + ": " + word.text;
								position(wordEl, moveBoundingBox(Object.assign({...word.boundingBox}, {
									bottom: line.boundingBox.bottom,
								}), -paragraph.boundingBox.left, -paragraph.boundingBox.top));
								const onclick = (event: MouseEvent) => {
									const menu = new Menu();

									menu.addItem((item) =>
										item
											.setTitle(`Confirm '${word.text}'`)
											.setIcon("check")
											.onClick(() => {
												word.confirmed = true;
												wordEl.removeClass(confidenceClass);
												wordEl.addClass('confirmed');
											})
									);

									menu.addItem((item) =>
										item
											.setTitle(`Delete '${word.text}'`)
											.setIcon("delete")
											.onClick(() => {
												line.words.remove(word);
												wordEl.remove();
											})
									);

									menu.addItem((item) =>
										item
											.setTitle(`Correct '${word.text}'`)
											.setIcon("pen-line")
											.onClick(() => {
												console.log(item);
											})
									);

									menu.addItem((item) =>
										item
											.setTitle("Copy")
											.setIcon("documents")
											.onClick(() => {
												const {clipboard} = require('electron');
												clipboard.writeText(word.text);
												new Notice("Copied");
											})
									);

									menu.showAtMouseEvent(event);
								};
								wordEl.onclick = onclick;
								wordEl.oncontextmenu = onclick;
							}
						}
					}
					// const areaEl = layer.createEl('div', {cls: 'area-box'});
					// position(areaEl, area.boundingBox);
				}
			}

			// @ts-ignore
			const pdfViewer = <HTMLElement>view.contentEl.querySelector('.pdf-viewer');
			const loadedPages = pdfViewer.querySelectorAll('.page[data-loaded="true"]');
			loadedPages.forEach((pageEl: HTMLElement) => {
				const canvas = pageEl.querySelector('canvas')!;
				const width = parseFloat(canvas.style.width);
				const height = parseFloat(canvas.style.height);
				overlayPage(pageEl, width, height);
			});

			// @ts-ignore
			view.viewer.child.on('pagerender', (e) => {
				const pageView = <PDFPageView>e.source;
				console.log(pageView);
				const pageEl = <HTMLDivElement>pageView.div;
				const canvas = pageEl.querySelector('canvas')!;
				// console.log("widths:");
				// console.log(canvas.width);
				// console.log(canvas.offsetWidth);
				// console.log(canvas.clientWidth);
				// console.log(canvas.scrollWidth);
				// console.log(canvas.innerWidth);
				// console.log(canvas.style.width);
				// console.log(canvas.getBoundingClientRect().width);
				// console.log((<PDFPageProxy>pageView.pdfPage).view[2]);
				let width: number;
				let height: number;
				if (canvas.style.width == "") {
					width = canvas.getBoundingClientRect().width;
					height = canvas.getBoundingClientRect().height;
				} else {
					width = parseFloat(canvas.style.width);
					height = parseFloat(canvas.style.height);
				}
				// overlayPage(pageEl, e.source.width / e.source.scale, e.source.height / e.source.scale);
				overlayPage(pageEl, width, height);
			});
		},
	});
}
