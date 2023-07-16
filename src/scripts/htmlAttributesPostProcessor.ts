import DnDPlugin from "./main";

const ATTRIBUTES_REGEX = /^\{\^* *([^}\n ][^}\n]*) *}$/;

export async function registerHTMLAttributesPostProcessor(this: DnDPlugin) {
	this.registerMarkdownPostProcessor((element) => {
		element.querySelectorAll('code').forEach((el) => {
			const text = el.textContent!;
			if (ATTRIBUTES_REGEX.test(text)) {
				const parent = el.parentElement!;
				el.remove();
				const textWithin = text.substring(1, text.length - 1);
				apply(parent, textWithin);
			}
		})
	});
}

function apply(element: HTMLElement, text: string) {
	let currentEl = element;
	let currentText = text;
	while (currentText.startsWith('^')) {
		currentEl = currentEl.parentElement!;
		currentText = currentText.substring(1);
	}
	// CREDIT: https://github.com/javalent/markdown-attributes/blob/main/src/processor.ts#L65-L70
	const parts = currentText
		// Split the string at spaces that are *not* between quotes.
		.split(/\s(?=(?:[^'"`]*(['"`])[^'"`]*\1)*[^'"`]*$)/)
		// Trim the resulting strings.
		.map((t) => t && t.trim())
		// Remove any strings that are undefined, zero length, or just a quote character.
		.filter((t) => t && t !== '"' && t !== "'" && t.length);
	parts.forEach((part) => applyPart(currentEl, part));
}

function applyPart(element: HTMLElement, text: string) {
	if (text.startsWith('.')) {
		element.addClass(text.substring(1));
	} else if (text.startsWith('#')) {
		element.id = text.substring(1);
	} else if (text.contains('=')) {
		let [key, value] = text.split('=', 2);
		if (value.startsWith('"') && value.endsWith('"')) {
			value = value.substring(1, value.length - 1);
		}
		element.setAttr(key, value);
	}
}
