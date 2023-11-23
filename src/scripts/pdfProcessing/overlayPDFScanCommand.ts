import DnDPlugin from "../main";
import {Menu, Notice, TFile, View} from "obsidian";
import {moveBoundingBox, RelativeBoundingBox, ScannedParagraph} from "./hocrImport";
import {PDFPageView} from "pdfjs-dist/types/web/pdf_page_view";
import {data, scannedPDFs} from "../data";

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
            const pdfFile = <TFile>view.file;
            const pdfPath = pdfFile.path;

            if (!(pdfPath in scannedPDFs)) {
                console.warn('no scan data available for ' + pdfPath);
                return;
            }

            const document = scannedPDFs[pdfPath];
            console.log(scannedPDFs);

            let selectedParagraphs: { page: number, paragraph: ScannedParagraph, paragraphEl: HTMLDivElement }[] = [];

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

                const pageNumber = parseInt(pageEl.dataset.pageNumber!);
                console.log(pageEl.dataset.pageNumber);
                const index = pageNumber - 1;
                const page = document.pages[index];
                console.log(page);
                for (const area of page.areas) {
                    // const areaEl = layer.createEl('div', {cls: 'area-box'});
                    // position(areaEl, area.boundingBox);
                    for (const paragraph of area.paragraphs) {
                        const paragraphEl = layer.createEl('div', {cls: 'paragraph-box'});
                        /*const text = paragraph.lines.map(line => line.words.map(word => word.text).join(" ")).join("\n");
                        paragraphEl.onclick = () => {
                            console.log("clicked!");
                            const {clipboard} = require('electron');
                            clipboard.writeText(text);
                        };
                        paragraphEl.title = text;*/
                        position(paragraphEl, paragraph.boundingBox);
                        paragraphEl.onclick = () => {
                            console.log("clicked on paragraph");
                            const index = selectedParagraphs.findIndex(it => it.paragraph == paragraph);
                            if (index == -1) {
                                selectedParagraphs.push({page: pageNumber, paragraph, paragraphEl});
                                paragraphEl.addClass('selected');
                            } else {
                                selectedParagraphs.splice(index, 1);
                                paragraphEl.removeClass('selected');
                            }
                        };
                        for (const line of paragraph.lines) {
                            const lineEl = paragraphEl.createEl('div', {cls: 'line-box'});
                            position(lineEl, moveBoundingBox(line.boundingBox, -paragraph.boundingBox.left, -paragraph.boundingBox.top));
                            for (const word of line.words) {
                                const confidenceClass =
                                    word.confirmed ? 'confirmed' :
                                        word.confidence < 20 ? 'extremely-low-confidence' :
                                            word.confidence < 60 ? 'low-confidence' :
                                                word.confidence < 80 ? 'moderate-confidence' :
                                                    'high-confidence'
                                const wordEl = paragraphEl.createEl('div', {cls: ['word-box', confidenceClass]});
                                wordEl.title = word.confidence + ": " + word.text;
                                if (word.confirmed) wordEl.title += " (confirmed)";
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
                                                wordEl.title = word.confidence + ": " + word.text + " (confirmed)";
                                            })
                                    );

                                    menu.addItem((item) =>
                                        item
                                            .setTitle(`Delete '${word.text}'`)
                                            .setIcon("delete")
                                            .onClick(() => {
                                                line.words.remove(word);
                                                wordEl.remove();
                                                if (line.words.length == 0) {
                                                    paragraph.lines.remove(line);
                                                    lineEl.remove();
                                                    if (paragraph.lines.length == 0) {
                                                        area.paragraphs.remove(paragraph);
                                                        paragraphEl.remove();
                                                        if (area.paragraphs.length == 0) {
                                                            page.areas.remove(area);
                                                            // areaEl.remove();
                                                            // don't remove page
                                                        }
                                                    }
                                                }
                                            })
                                    );

                                    menu.addItem((item) =>
                                        item
                                            .setTitle(`Correct '${word.text}'`)
                                            .setIcon("eraser")
                                            .onClick(() => {
                                                console.log(item);
                                                // @ts-ignore
                                                const itemEl = <HTMLDivElement>item.dom;
                                                const menuEl = itemEl.parentElement!;
                                                const inputEl = window.document.body.createEl('input', {cls: 'correct-word-input', placeholder: word.text});
                                                inputEl.onkeyup = ({key}) => {
                                                    if (key != "Enter") return;
                                                    word.text = inputEl.value;
                                                    word.confirmed = true;
                                                    wordEl.removeClass(confidenceClass);
                                                    wordEl.addClass('confirmed');
                                                    wordEl.title = word.confidence + ": " + word.text;
                                                    if (word.confirmed) wordEl.title += " (confirmed)";
                                                    inputEl.remove();
                                                }
                                                inputEl.style.top = menuEl.style.top;
                                                inputEl.style.left = parseInt(menuEl.style.left) + menuEl.offsetWidth + 20 + "px";
                                                inputEl.focus();
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

                                    menu.addItem((item) =>
                                        item
                                            .setTitle("Clear paragraph selection")
                                            .setIcon("x-circle")
                                            .onClick(() => {
                                                for (let selectedParagraph of selectedParagraphs) {
                                                    selectedParagraph.paragraphEl.removeClass('selected');
                                                }
                                                selectedParagraphs = [];
                                            })
                                    );

                                    menu.addItem((item) =>
                                        item
                                            .setTitle("Copy citation of selected paragraphs to clipboard")
                                            .setIcon("clipboard-copy")
                                            .onClick(() => {
                                                let paragraphTexts: string[] = [];
                                                for (let {paragraph} of selectedParagraphs) {
                                                    let paragraphText = "";
                                                    let join = false;
                                                    for (let {words} of paragraph.lines) {
                                                        if (join) {
                                                            join = false;
                                                        } else {
                                                            paragraphText += " ";
                                                        }
                                                        let lineText = words.map(word => word.text).join(" ");
                                                        if (lineText.endsWith('-')) {
                                                            join = true;
                                                            lineText = lineText.substring(0, lineText.length - 2);
                                                        }
                                                        paragraphText += lineText;
                                                    }
                                                    paragraphText = paragraphText.trim();
                                                    paragraphTexts.push(paragraphText);
                                                }
                                                let pageNumbers = selectedParagraphs.map(p => p.page).unique().sort((a, b) => a - b);
                                                let totalText = "";
                                                totalText += "[!source]+ ";
                                                let prefix = data.customPDFPrefixes[pdfPath];
                                                if (prefix !== undefined) {
                                                    totalText += prefix;
                                                }
                                                // [[Waterdeep Dragon Heist.pdf#page=16|Waterdeep: Dragon Heist, p. 15 - 16]]
                                                totalText += "[[" + pdfFile.name + "#page=" + pageNumbers.first()! + "|" + pdfFile.basename + ", p. ";
                                                if (pageNumbers.length == 1) {
                                                    totalText += pageNumbers[0];
                                                } else {
                                                    totalText += pageNumbers.first();
                                                    totalText += " - ";
                                                    totalText += pageNumbers.last();
                                                }
                                                totalText += "]]\n";
                                                totalText += paragraphTexts.join("\n~ ");
                                                const text = totalText.split("\n").map(s => ">" + s).join("\n");
                                                const {clipboard} = require('electron');
                                                clipboard.writeText(text);
                                                new Notice("Copied");
                                            })
                                    );

                                    menu.showAtMouseEvent(event);
                                };
                                // wordEl.onclick = onclick;
                                wordEl.oncontextmenu = onclick;
                            }
                        }
                    }
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
