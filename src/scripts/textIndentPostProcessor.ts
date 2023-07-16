import DnDPlugin from "./main";

export function registerTextIndentPostProcessor(this: DnDPlugin) {
	this.registerMarkdownPostProcessor((element) => {
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

		while (true) {
			const node = <Text> walker.nextNode();
			if (node === null) break;

			const textContent = node.textContent!;
			if (textContent.trimStart().startsWith(this.settings.textIndentPrefix)) {
				node.textContent = ' ' + textContent.substring(this.settings.textIndentPrefix.length).trimStart();
			}
		}
	})
}
