import { EditorView, WidgetType } from "@codemirror/view";

export class TextIndentWidget extends WidgetType {
	toDOM(view: EditorView): HTMLElement {
		const div = document.createElement("span");

		div.textContent = ' ';

		return div;
	}
}
