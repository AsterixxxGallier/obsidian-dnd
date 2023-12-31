import {syntaxTree} from '@codemirror/language';
import {RangeSetBuilder} from '@codemirror/state';
import {Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate,} from '@codemirror/view';
import {TextIndentWidget} from './textIndentWidget';
import DnDPlugin from "../../main";
import {selectionAndRangeOverlap} from "../../utils";

class TextIndentExtension implements PluginValue {
	decorations: DecorationSet;
	plugin: DnDPlugin

	constructor(view: EditorView, plugin: DnDPlugin) {
		this.plugin = plugin;
		this.decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged || update.startState.selection != update.state.selection) {
			this.decorations = this.buildDecorations(update.view);
		}
	}

	destroy() {
	}

	buildDecorations(view: EditorView): DecorationSet {
		const prefix = this.plugin.settings.textIndentPrefix;
		const selection = view.state.selection;
		const builder = new RangeSetBuilder<Decoration>();

		for (let {from, to} of view.visibleRanges) {
			syntaxTree(view.state).iterate({
				from,
				to,
				enter(node) {
					const text = view.state.sliceDoc(node.from, node.to);
					for (let i = 0; i < text.length - prefix.length; i++) {
						if (!(i == 0 && text.startsWith(prefix) || text.substring(i - 1).startsWith('\n' + prefix))) {
							continue;
						}
						const from = node.from + i;
						const to = node.from + i + prefix.length;
						if (selectionAndRangeOverlap(selection, from, to)) continue;
						try {
							builder.add(
								from,
								to,
								Decoration.replace({
									widget: new TextIndentWidget(),
								})
							);
						} catch (e) {
							console.warn(e.message);
						}
					}
				},
			});
		}

		return builder.finish();
	}
}

export function registerTextIndentExtension(this: DnDPlugin) {
	this.registerEditorExtension(ViewPlugin.define(
		(view) => new TextIndentExtension(view, this),
		{
			decorations: (value: TextIndentExtension) => value.decorations,
		}
	));
}
