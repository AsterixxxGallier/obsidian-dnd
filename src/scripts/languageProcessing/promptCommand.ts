import DnDPlugin from "../main";
import {PromptModal} from "./promptModal";
import {makeRequest, RequestBody} from "../gpt4allAPIBinding";
import {Notice} from "obsidian";

export function registerPromptCommand(this: DnDPlugin) {
	this.addCommand({
		id: "prompt-language-ai",
		name: "Prompt language AI",
		callback: () => {
			new PromptModal(this.app, async (prompt, temperature, max_tokens) => {
				let body: RequestBody = {
					model: "any string works here",
					messages: [
						{
							role: "user",
							content: prompt,
						}
					],
					temperature,
					max_tokens,
					// presence_penalty: 2.0,
					// frequency_penalty: 2.0,
				};
				console.log(body);
				const response = await makeRequest(body);
				console.log(response);
				new Notice(response.choices[0].message.content, 0);
			}).open();
		},
	});
}
