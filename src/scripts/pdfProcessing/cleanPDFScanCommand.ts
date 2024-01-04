import DnDPlugin from "../main";
import {TFile, View} from "obsidian";
import {cleanScannedDocument} from "./hocrImport";
import {markScannedPDFsChanged, saveScannedPDFs, scannedPDFs} from "../data";

export function registerCleanPDFScanCommand(this: DnDPlugin) {
	this.addCommand({
		id: "clean-pdf-scan",
		name: "Clean PDF Scan",
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

			cleanScannedDocument(document);

			markScannedPDFsChanged();

			await saveScannedPDFs();
		},
	});
}
