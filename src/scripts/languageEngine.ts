import {Notice} from "obsidian";

// https://github.com/qgrail/obsidian-ai-assistant
// https://github.com/brianpetro/obsidian-smart-connections/issues/124
// https://docs.gpt4all.io/gpt4all_chat.html#server-mode

// eslint-disable-next-line @typescript-eslint/no-var-requires
import {Configuration, OpenAIApi} from "openai";

class CustomFormData extends FormData {
	getHeaders() {
		return {};
	}
}

export class OpenAI {
	modelName: string;
	apiFun: any;
	maxTokens: number;
	apiKey: string;

	constructor(apiKey: string, modelName: string, maxTokens: number) {
		console.log(Configuration);
		const configuration = new Configuration({
			apiKey: apiKey,
			formDataCtor: CustomFormData,
		});
		this.apiFun = new OpenAIApi(configuration);
		this.modelName = modelName;
		this.maxTokens = maxTokens;
		this.apiKey = apiKey;
	}

	api_call = async (
		prompt_list: { [key: string]: string }[],
	) => {
		// const streamMode = htmlEl !== undefined;

		try {
			const response = await fetch(
				// "https://api.openai.com/v1/chat/completions",
				"http://localhost:4891/v1/completions",
				{
					method: "POST",
					// headers: {
					// 	"Content-Type": "application/json",
					// 	Authorization: `Bearer ${this.apiKey}`,
					// },
					headers: {
						'User-Agent': 'OpenAI/v1 PythonBindings/0.28.1',
						'Accept-Encoding': 'gzip, deflate',
						'Accept': '*/*',
						'Connection': 'keep-alive',
						'X-OpenAI-Client-User-Agent': '{"bindings_version": "0.28.1", "httplib": "requests", "lang": "python", "lang_version": "3.9.7", "platform": "Windows-10-10.0.19045-SP0", "publisher": "openai", "uname": "Windows 10 10.0.19045 AMD64"}',
						'Authorization': 'Bearer not needed for a local LLM',
						'Content-Type': 'application/json',
						'Content-Length': '151'
					},
					// body: JSON.stringify({
					// 	model: this.modelName,
					// 	max_tokens: this.maxTokens,
					// 	messages: prompt_list,
					// 	stream: streamMode,
					// }),
					body: '{"model": "mistral-7b-instruct-v0.1.Q4_0", "prompt": "Tell me I\'m stupid.", "max_tokens": 5, "temperature": 0.28, "top_p": 0.95, "n": 1, "echo": false}'
				}
			);
			/*if (streamMode) {
				const reader = response.body?.getReader();
				const textDecoder = new TextDecoder("utf-8");

				if (!reader) {
					throw new Error("Error: fail to read data from response");
				}

				let responseText = "";
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = textDecoder.decode(value);

					let currentText = "";
					for (const line of chunk.split("\n")) {
						const trimmedLine = line.trim();

						if (!trimmedLine || trimmedLine === "data: [DONE]") {
							continue;
						}

						const response = JSON.parse(
							trimmedLine.replace("data: ", "")
						);
						const content = response.choices[0].delta.content;
						if (!content) continue;

						currentText = currentText.concat(content);
					}
					responseText += currentText;
					// Reset inner HTML before rendering Markdown
					htmlEl.innerHTML = "";
					if (streamMode) {
						if (view) {
							await MarkdownRenderer.renderMarkdown(
								responseText,
								htmlEl,
								"",
								view
							);
						} else {
							htmlEl.innerHTML += currentText;
						}
					}
				}
				return htmlEl.innerHTML;
			} else {
				const data = await response.json();
				return data.choices[0].message.content;
			}*/
			const data = await response.json();
			return <string>data.choices[0].message.content;
		} catch (err) {
			new Notice("## OpenAI API ## " + err);
		}
	};
}

export async function test() {
	/*const openai = new OpenAI(
		"not required",
		"mistral-7b-instruct-v0.1.Q4_0",
		5,
	);
	const answer = (await openai.api_call([{
		role: "user",
		content: "Tell me I'm stupid.",
	}]))!;
	console.log(answer);*/
}

/*
import OpenAI from 'openai';

const openai = new OpenAI({
	baseURL: 'http://localhost:4891/v1',
	apiKey: 'not needed for a local LLM', // defaults to process.env["OPENAI_API_KEY"]
	// not dangerous, this is local
	dangerouslyAllowBrowser: true,
});

export async function test() {
	const chatCompletion = await openai.chat.completions.create({
		messages: [{ role: 'user', content: 'Say this is a test' }],
		model: 'mistral-7b-instruct-v0.1.Q4_0',
	});

	console.log(chatCompletion.choices);
}
*/
