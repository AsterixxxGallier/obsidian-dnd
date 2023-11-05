import DnDPlugin from "../main";
import {makeRequest, RequestBody} from "../gpt4allAPIBinding";
import {Notice} from "obsidian";
const {clipboard} = require('electron');

export function registerSummarizeCommand(this: DnDPlugin) {
	this.addCommand({
		id: "language-ai-summarize",
		name: "Summarize",
		// editorCallback: async (editor: Editor, _view: MarkdownView) => {
		callback: async () => {
			// const text = editor.getSelection();
			const text = await clipboard.readText();
			if (text == "") {
				console.warn("empty text, nothing to summarize");
				return;
			}
			new Notice(await summarize(text), 0);
		},
	});
}

/*async function summarizeDirectly(text: string): Promise<string> {
	let body: RequestBody = {
		model: "any string works here",
		messages: [
			{
				role: "user",
				content: "Please summarize the following text.\n" + text,
			}
		],
		temperature: 0.7,
		max_tokens: 2000,
	};
	const response = await makeRequest(body);
	return response.choices[0].message.content;
}*/

async function summarizeStrategically(text: string): Promise<string> {
	const summaries = await (async () => {
		let body: RequestBody = {
			model: "any string works here",
			messages: [
				{
					role: "user",
					content: "Please summarize the following text.\n" + text,
				}
			],
			temperature: 0.7,
			max_tokens: 2000,
			n: 4
		};
		const response = await makeRequest(body);
		return response.choices.map(choice => choice.message.content);
	})();
	let body: RequestBody = {
		model: "any string works here",
		messages: [
			{
				role: "user",
				content: "<Text>" + text + "</Text>" +
					summaries.map((summary, index) =>
						"\n<Summary#" + index + ">" + summary + "</Summary#" + index + ">"
					).join("") +
					"\nPlease compare the summaries and pick the most accurate one.",
			}
		],
		temperature: 0.7,
		max_tokens: 2000,
	};
	const response = await makeRequest(body);
	return response.choices[0].message.content;
}

async function summarize(text: string): Promise<string> {
	// return await summarizeDirectly(text);
	return await summarizeStrategically(text);
}
