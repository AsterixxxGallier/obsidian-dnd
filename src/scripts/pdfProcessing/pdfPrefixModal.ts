import { App, Modal, Setting } from "obsidian";

type OnSubmit = (prefix: string) => void;

export class PDFPrefixModal extends Modal {
	pdfPath: string;
	prefix: string;
	onSubmit: OnSubmit;

	constructor(app: App, pdfPath: string, onSubmit: OnSubmit) {
		super(app);
		this.pdfPath = pdfPath;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "Please enter a prefix for " + this.pdfPath });

		new Setting(contentEl)
			.setName("Prefix")
			.addText((text) =>
				text.onChange((value) => {
					this.prefix = value
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.prefix);
					}));
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
