import DnDPlugin from "../main";
import {App, Modal, Setting} from "obsidian";
import {scannedPDFs} from "../data";

export class HOCRImportModal extends Modal {
	pdfFilePath: string;
	hocrDirectoryPath: string;
	onSubmit: (pdfFilePath: string, hocrDirectoryPath: string) => void;

	constructor(app: App, onSubmit: (pdfFilePath: string, hocrDirectoryPath: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl("h1", {text: "Import hOCR files and associate them with a PDF file"});

		new Setting(contentEl)
			.setName("PDF file path")
			.addText((text) =>
				text.onChange((value) => {
					this.pdfFilePath = value
				}));

		new Setting(contentEl)
			.setName("hOCR directory path")
			.addText((text) =>
				text.onChange((value) => {
					this.hocrDirectoryPath = value
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Import")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.pdfFilePath, this.hocrDirectoryPath);
					}));
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}

export function registerHOCRImportCommand(this: DnDPlugin) {
	this.addCommand({
		id: "hocr-import",
		name: "Import hOCR data for a PDF file",
		callback: async () => {
			new HOCRImportModal(app, async (pdfFilePath, hocrDirectoryPath) => {
				const sourceFiles = (await app.vault.adapter.list(hocrDirectoryPath)).files;
				const documents: HOCRDocument[] = [];
				// FIXME are we iterating in the correct order?
				for (const path of sourceFiles) {
					console.log(path.substring(hocrDirectoryPath.length + 1));
					const hocrSource = await app.vault.adapter.read(path);
					const parser = new DOMParser();
					const xmlDocument = parser.parseFromString(hocrSource, "text/xml");
					// console.log(xmlDocument);
					const hocrDocument = xmlToHOCR(xmlDocument);
					// console.log(hocrDocument);
					// hocrDocument.pages.forEach(page =>
					// 	page.areas.forEach(area =>
					// 		area.paragraphs.forEach(paragraph =>
					// 			paragraph.lines.forEach(line =>
					// 				line.words.forEach(word => {
					// 					if (word.confidence < 80) console.log(path, word);
					// 				})))));
					documents.push(hocrDocument);
				}
				const joinedDocument = joinHOCRDocuments(documents);
				const scannedDocument = hocrDocumentToScannedDocument(joinedDocument);
				cleanScannedDocument(scannedDocument);
				scannedPDFs[pdfFilePath] = scannedDocument;
				/*const paragraphsWithLineSize = extractParagraphs(joinedDocument);
				console.log(paragraphsWithLineSize);
				const paragraphsCategorized = paragraphsWithLineSize
					.map(({averageLineSize, text}) => {
						const categories = [[23, 27], [30, 35], [38, 42], [42, 46], [48, 52], [55, 75], [180, 220]];
						const level = categories
							.findIndex(([min, max]) => min <= averageLineSize && averageLineSize <= max);
						return ({
							level: level == -1 ? null : level,
							text
						});
					});
				console.log(paragraphsCategorized);
				const paragraphsStripped = <{ level: number; text: string }[]>paragraphsCategorized
					.filter(({level, text: _}) => level != null && level != 0);
				// for (let {level, text} of paragraphsStripped) {
				// 	console.log(level, text);
				// }
				const root: (Heading | Paragraph)[] = [];
				const stack: { level: number, heading: Heading }[] = [];
				for (let {level, text} of paragraphsStripped) {
					let top = stack.last();
					if (top == undefined) {
						if (level == 1) {
							root.push({text});
						} else {
							const heading = {text, content: []};
							root.push(heading);
							stack.push({level, heading});
						}
					} else {
						if (level == 1) {
							top.heading.content.push({text});
						} else {
							while (top != undefined && level >= top.level) {
								stack.pop()
								top = stack.last();
							}
							const heading = {text, content: []};
							if (top == undefined) {
								root.push(heading);
							} else {
								top.heading.content.push(heading);
							}
							stack.push({level, heading});
						}
					}
				}
				console.log(root);

				let indent = 1;

				function walk(nodes: (Heading | Paragraph)[]) {
					nodes.forEach(function (node) {
						console.log('--' + Array(indent).join('--'), node.text);
						if ("content" in node) {
							indent++;
							walk(node.content);
						}
						if (nodes.indexOf(node) === nodes.length - 1) {
							indent--;
						}
					})
				}

				// walk(root);*/
			}).open();
		},
	});
}

interface Heading {
	text: string,
	content: (Heading | Paragraph)[],
}

interface Paragraph {
	text: string,
}

function extractParagraphs(document: HOCRDocument): { averageLineSize: number, text: string }[] {
	const unprocessed =
		document.pages.flatMap(page =>
			page.areas.flatMap(area =>
				area.paragraphs));
	const lineGroups = unprocessed.map(paragraph => paragraph.lines.map(line => {
		return {size: line.size, text: line.words.map(word => word.text).join(" ")};
	}));
	const paragraphs: { totalLineSize: number, lineNumber: number, text: string }[] = [];
	let appendToLastParagraph = false;
	for (const lines of lineGroups) {
		let joined = "";
		let totalLineSize = 0;
		for (let {size, text: line} of lines) {
			if (line.endsWith("-")) {
				joined += line.substring(0, line.length - 1);
			} else {
				joined += line + " ";
			}
			totalLineSize += size;
		}
		if (appendToLastParagraph) {
			const lastParagraph = paragraphs[paragraphs.length - 1];
			lastParagraph.text += joined;
			lastParagraph.totalLineSize += totalLineSize;
			lastParagraph.lineNumber += lines.length;
		} else {
			paragraphs.push({totalLineSize, lineNumber: lines.length, text: joined});
		}
		appendToLastParagraph = !joined.endsWith(" ");
	}
	return paragraphs.map(({totalLineSize, lineNumber, text}) => ({
		averageLineSize: totalLineSize / lineNumber,
		text: text.trim()
	})).filter(({text}) => text != "");
}

function xmlToHOCR(xml: Document): HOCRDocument {
	function parseTitleProperties(element: HTMLElement): { [key: string]: string } {
		return Object.fromEntries(element.title.split("; ").map(entry => {
			const index = entry.indexOf(" ");
			return [
				entry.substring(0, index),
				entry.substring(index + 1),
			];
		}));
	}

	function parseBoundingBox(string: string): HOCRBoundingBox {
		const [left, top, right, bottom] = string.split(" ").map(value => parseInt(value));
		return {left, top, right, bottom}
	}

	function parseBaseline(string: string): HOCRBaseline {
		const [xOffset, yOffset] = string.split(" ").map(value => parseFloat(value));
		return {xOffset, yOffset}
	}

	const ocrSystem = (<HTMLMetaElement>xml.head.querySelector('meta[name="ocr-system"]')!).content;
	const ocrCapabilities = (<HTMLMetaElement>xml.head.querySelector('meta[name="ocr-capabilities"]')!).content.split(" ");
	const pages: HOCRPage[] = [];
	xml.body.querySelectorAll('div.ocr_page').forEach(xmlPage => {
		const titleProperties = parseTitleProperties(<HTMLElement>xmlPage);
		const number = parseInt(titleProperties["ppageno"]);
		const imagePath = titleProperties["image"];
		const boundingBox = parseBoundingBox(titleProperties["bbox"]);
		const areas: HOCRArea[] = [];
		xmlPage.querySelectorAll('div.ocr_carea').forEach(xmlArea => {
			const titleProperties = parseTitleProperties(<HTMLElement>xmlArea);
			const boundingBox = parseBoundingBox(titleProperties["bbox"]);
			const paragraphs: HOCRParagraph[] = [];
			xmlArea.querySelectorAll('p.ocr_par').forEach(xmlParagraph => {
				const titleProperties = parseTitleProperties(<HTMLElement>xmlParagraph);
				const boundingBox = parseBoundingBox(titleProperties["bbox"]);
				const lines: HOCRLine[] = [];
				xmlParagraph.querySelectorAll('span.ocr_line').forEach(xmlLine => {
					const titleProperties = parseTitleProperties(<HTMLElement>xmlLine);
					const boundingBox = parseBoundingBox(titleProperties["bbox"]);
					// console.log(xmlLine, titleProperties["baseline"]);
					const baselineString: string | undefined = titleProperties["baseline"];
					const baseline = baselineString == undefined ? undefined : parseBaseline(baselineString);
					const size = parseFloat(titleProperties["x_size"]);
					const ascenders = parseFloat(titleProperties["x_ascenders"]);
					const descenders = parseFloat(titleProperties["x_descenders"]);
					const words: HOCRWord[] = [];
					xmlLine.querySelectorAll('span.ocrx_word').forEach(xmlWord => {
						const titleProperties = parseTitleProperties(<HTMLElement>xmlWord);
						const boundingBox = parseBoundingBox(titleProperties["bbox"]);
						const confidence = parseInt(titleProperties["x_wconf"]);
						const text = xmlWord.textContent!;
						words.push({boundingBox, confidence, text})
					});
					lines.push({boundingBox, baseline, size, ascenders, descenders, words})
				});
				paragraphs.push({boundingBox, lines})
			});
			areas.push({boundingBox, paragraphs})
		});
		pages.push({number, imagePath, boundingBox, areas});
	});
	return {ocrSystem, ocrCapabilities, pages};
}

function joinHOCRDocuments(documents: HOCRDocument[]): HOCRDocument {
	const pages = [];
	for (const document of documents) {
		pages.push(...document.pages.map(page => ({
			number: page.number + pages.length,
			imagePath: page.imagePath,
			boundingBox: page.boundingBox,
			areas: page.areas,
		})));
	}
	return {
		ocrSystem: documents[0].ocrSystem,
		ocrCapabilities: documents[0].ocrCapabilities,
		pages
	};
}

function hocrDocumentToScannedDocument(document: HOCRDocument): ScannedDocument {
	return {
		pages: document.pages.map(page => {
			const pageBoundingBox = page.boundingBox;
			console.assert(pageBoundingBox.left == 0 && pageBoundingBox.top == 0, pageBoundingBox);
			const pageWidth = pageBoundingBox.right;
			const pageHeight = pageBoundingBox.bottom;

			function makeRelative(boundingBox: HOCRBoundingBox): RelativeBoundingBox {
				return {
					left: boundingBox.left / pageWidth,
					top: boundingBox.top / pageHeight,
					right: boundingBox.right / pageWidth,
					bottom: boundingBox.bottom / pageHeight,
				}
			}

			return ({
				boundingBox: makeRelative(pageBoundingBox),
				areas: page.areas.map(area => ({
					boundingBox: makeRelative(area.boundingBox),
					paragraphs: area.paragraphs.map(paragraph => ({
						boundingBox: makeRelative(paragraph.boundingBox),
						lines: paragraph.lines.map(line => ({
							boundingBox: makeRelative(line.boundingBox),
							relativeSize: line.size / pageHeight,
							relativeAscenderSize: line.ascenders / pageHeight,
							relativeDescenderSize: line.descenders / pageHeight,
							words: line.words.map(word => ({
								boundingBox: makeRelative(word.boundingBox),
								confidence: word.confidence,
								confirmed: false,
								text: word.text,
							})),
						})),
					})),
				})),
			});
		}),
	};
}

export function cleanScannedDocument(document: ScannedDocument) {
	for (let i = 0; i < document.pages.length; i++){
		const page = document.pages[i];
		for (let i1 = 0; i1 < page.areas.length; i1++){
			const area = page.areas[i1];
			for (let i2 = 0; i2 < area.paragraphs.length; i2++){
				const paragraph = area.paragraphs[i2];
				for (let i3 = 0; i3 < paragraph.lines.length; i3++){
					const line = paragraph.lines[i3];
					for (let i4 = 0; i4 < line.words.length; i4++){
						const word = line.words[i4];
						// FIXME doesn't seem to work
						if (word.text.trim() == "") {
							line.words.remove(word);
						}
					}
					if (line.words.length == 0) {
						paragraph.lines.remove(line);
					}
				}
				if (paragraph.lines.length == 0) {
					area.paragraphs.remove(paragraph);
				}
			}
			if (area.paragraphs.length == 0) {
				page.areas.remove(area);
			}
		}
	}
}

// region scanned interfaces
export interface ScannedDocument {
	pages: ScannedPage[],
}

export interface ScannedPage {
	boundingBox: RelativeBoundingBox,
	areas: ScannedArea[],
}

export interface ScannedArea {
	boundingBox: RelativeBoundingBox,
	paragraphs: ScannedParagraph[],
}

export interface ScannedParagraph {
	boundingBox: RelativeBoundingBox,
	lines: ScannedLine[],
}

export interface ScannedLine {
	boundingBox: RelativeBoundingBox,
	relativeSize: number,
	relativeAscenderSize: number,
	relativeDescenderSize: number,
	words: ScannedWord[],
}

export interface ScannedWord {
	boundingBox: RelativeBoundingBox,
	confidence: number,
	confirmed: boolean,
	text: string,
}

export interface RelativeBoundingBox {
	left: number,
	top: number,
	right: number,
	bottom: number,
}

export function moveBoundingBox(boundingBox: RelativeBoundingBox, x: number, y: number): RelativeBoundingBox {
	return {
		left: boundingBox.left + x,
		top: boundingBox.top + y,
		right: boundingBox.right + x,
		bottom: boundingBox.bottom + y,
	}
}
// endregion

// region hOCR interfaces
interface HOCRDocument {
	ocrSystem: string,
	ocrCapabilities: string[],
	pages: HOCRPage[],
}

interface HOCRPage {
	// zero based page index
	number: number,
	imagePath: string,
	boundingBox: HOCRBoundingBox,
	areas: HOCRArea[],
}

interface HOCRArea {
	boundingBox: HOCRBoundingBox,
	paragraphs: HOCRParagraph[],
}

interface HOCRParagraph {
	boundingBox: HOCRBoundingBox,
	lines: HOCRLine[],
}

interface HOCRLine {
	boundingBox: HOCRBoundingBox,
	baseline?: HOCRBaseline,
	size: number,
	ascenders: number,
	descenders: number,
	words: HOCRWord[],
}

interface HOCRWord {
	boundingBox: HOCRBoundingBox,
	confidence: number,
	text: string,
}

interface HOCRBoundingBox {
	left: number,
	top: number,
	right: number,
	bottom: number,
}

interface HOCRBaseline {
	xOffset: number,
	yOffset: number,
}

// endregion
