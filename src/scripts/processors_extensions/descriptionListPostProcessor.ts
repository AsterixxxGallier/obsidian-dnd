import {MarkdownRenderChild} from "obsidian";
import DnDPlugin from "../main";

export function registerDescriptionListPostProcessor(this: DnDPlugin) {
	this.registerMarkdownPostProcessor((element, context) => {
		const lists = element.querySelectorAll('ul');
		for (let i = 0; i < lists.length; i++) {
			const list = lists.item(i);
			if (Array.from(list.querySelectorAll(':scope > li'))
				.every(node => node.textContent!.includes(this.settings.descriptionListSeparator))) {
				context.addChild(new DescriptionList(list, this));
			}
		}
	});
}

class DescriptionList extends MarkdownRenderChild {
	plugin: DnDPlugin;

	constructor(containerEl: HTMLElement, plugin: DnDPlugin) {
		super(containerEl);
		this.plugin = plugin;
	}

	onload() {
		const separator = this.plugin.settings.descriptionListSeparator;

		const items = Array.from(this.containerEl.querySelectorAll(':scope > li'));

		const list = this.containerEl.createEl('dl');

		for (const item of items) {
			const innerHTML = item.innerHTML;
			const index = innerHTML.indexOf(separator);

			if (index == -1) {
				const description = list.createEl('dd');
				description.innerHTML = innerHTML;
			} else {
				const term = list.createEl('dt');
				term.innerHTML = innerHTML.substring(0, index).trim();

				const description = list.createEl('dd');
				description.innerHTML = innerHTML.substring(index + separator.length).trim();
			}
		}

		this.containerEl.replaceWith(list);
	}
}
