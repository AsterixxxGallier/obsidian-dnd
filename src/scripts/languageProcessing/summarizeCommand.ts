import DnDPlugin from "../main";
import {makeRequest, RequestBody} from "../gpt4allAPIBinding";
import {Editor, MarkdownView, Notice} from "obsidian";

export function registerSummarizeCommand(this: DnDPlugin) {
	this.addCommand({
		id: "language-ai-summarize",
		name: "Summarize",
		editorCallback: async (editor: Editor, _view: MarkdownView) => {
			const selection = editor.getSelection();
			if (selection == "") {
				console.warn("empty selection, nothing to summarize");
				return;
			}
			let body: RequestBody = {
				model: "any string works here",
				messages: [
					{
						role: "user",
						content: "Please summarize the following text accurately and factually.\n" + selection,
					}
				],
				temperature: 0.7,
				max_tokens: 2000,
				// presence_penalty: 2.0,
				// frequency_penalty: 2.0,
			};
			console.log(body);
			const response = await makeRequest(body);
			console.log(response);
			new Notice(response.choices[0].message.content, 0);
		},
		// callback: () => {
		// 	new PromptModal(this.app, async (prompt, temperature, max_tokens) => {
		// 		let body: RequestBody = {
		// 			model: "any string works here",
		// 			messages: [
		// 				{
		// 					role: "user",
		// 					content: prompt,
		// 				}
		// 			],
		// 			temperature,
		// 			max_tokens,
		// 			// presence_penalty: 2.0,
		// 			// frequency_penalty: 2.0,
		// 		};
		// 		console.log(body);
		// 		const response = await makeRequest(body);
		// 		console.log(response);
		// 		new Notice(response.choices[0].message.content, 0);
		// 	}).open();
		// },
	});
}
