import DnDPlugin from "./main";

export async function registerTextIndentPostProcessor(this: DnDPlugin) {
	this.registerMarkdownPostProcessor((element) => {
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

		while (true) {
			const node = <Text> walker.nextNode();
			if (node === null) break;

			const textContent = node.textContent!;
			if (textContent.trimStart().startsWith(this.settings.textIndentPrefix)) {
				const textIndent = document.createElement('span');
				textIndent.addClass('text-indent');
				node.textContent = textContent.substring(this.settings.textIndentPrefix.length);
				node.parentNode!.insertBefore(textIndent, node);
			}
		}
	})
}
