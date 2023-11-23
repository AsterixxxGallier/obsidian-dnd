import DnDPlugin from "../main";
import {TFile, View} from "obsidian";
import {data} from "../data";
import {PDFPrefixModal} from "./pdfPrefixModal";

export function registerSetCustomPDFPrefixCommand(this: DnDPlugin) {
	this.addCommand({
		id: "set-custom-pdf-prefix",
		name: "Set custom PDF prefix",
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

			new PDFPrefixModal(app, pdfPath, (prefix) => data.customPDFPrefixes[pdfPath] = prefix).open();
		},
	});
}
