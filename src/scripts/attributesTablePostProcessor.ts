import DnDPlugin from "./main";

export function registerAttributesTablePostProcessor(this: DnDPlugin) {
	this.registerMarkdownCodeBlockProcessor('attributes', (source, el) => {
		const scores = source.split('/').map(s => s.trim());
		console.assert(scores.length == 6);

		const table = el.createEl('table', {cls: 'attributes'});
		const head = table.createEl('thead');
		const headRow = head.createEl('tr');
		const body = table.createEl('tbody');
		const bodyRow = body.createEl('tr');

		for (let i = 0; i < 6; i++) {
			const attribute = this.settings.attributes[i];
			const score = scores[i];
			const modifier = Math.floor(parseInt(score) / 2) - 5;
			const signedModifier = modifier >= 0 ? "+" + modifier : "" + modifier;
			headRow.createEl('th', {text: attribute});
			bodyRow.createEl('td', {text: `${score} (${signedModifier})`});
		}
	});
}
