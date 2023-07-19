import {App, Modal, Setting} from "obsidian";

export class PlaylistImportModal extends Modal {
	defaultArtist: string;
	onSubmit: (defaultArtist: string) => void;

	constructor(app: App, onSubmit: (defaultArtist: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const container = this.contentEl;
		this.titleEl.innerHTML = 'Import playlist';

		new Setting(container)
			.setName("Default artist")
			.addText((text) =>
				text
					.onChange((value) => {
						this.defaultArtist = value;
					}));

		new Setting(container)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.defaultArtist);
					}));
	}

	onClose() {
		const element = this.contentEl;
		element.empty();
	}
}
