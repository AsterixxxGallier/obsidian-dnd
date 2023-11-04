import { App, Modal, Setting } from "obsidian";

type OnSubmit = (prompt: string, temperature: number, max_tokens: number) => void;

export class PromptModal extends Modal {
	prompt: string;
	temperature: number = 0.7;
	max_tokens: number = 100;
	onSubmit: OnSubmit;

	constructor(app: App, onSubmit: OnSubmit) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "What's your prompt?" });

		new Setting(contentEl)
			.setName("Prompt")
			.addText((text) =>
				text.onChange((value) => {
					this.prompt = value
				}));

		new Setting(contentEl)
			.setName("Temperature")
			.addText((text) =>
				text.setValue(this.temperature.toString()).onChange((value) => {
					this.temperature = parseFloat(value)
				}));

		new Setting(contentEl)
			.setName("Token cap")
			.addText((text) =>
				text.setValue(this.max_tokens.toString()).onChange((value) => {
					this.max_tokens = parseInt(value)
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.prompt, this.temperature, this.max_tokens);
					}));
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
