import {spawn} from "child_process";

export interface RequestBody {
	model: string,
	messages: Message[],
	temperature: number,
	max_tokens?: number,
	presence_penalty?: number,
	frequency_penalty?: number,
	n?: number,
}

export interface RequestResponse {
	choices: Choice[],
	created: number,
	id: string,
	model: string,
	object: string,
	usage: Usage,
}

export interface Choice {
	finish_reason: string,
	index: number,
	message: Message,
	references: any[],
}

export interface Usage {
	completion_tokens: number,
	prompt_tokens: number,
	total_tokens: number,
}

export interface Message {
	role: "user" | "assistant",
	content: string,
}

export async function makeRequest(body: RequestBody): Promise<RequestResponse> {
	return new Promise((resolve, reject) => {
		let curlProcess = spawn("curl", [
			"http://localhost:4891/v1/chat/completions",
			"-H",
			"Content-Type: application/json",
			"-d",
			JSON.stringify(body)
				.replace(/%/g, "%%")
				.replace(/&/g, "^&")
				.replace(/</g, "^<")
				.replace(/>/g, "^>")
				.replace(/\|/g, "^|"),
		]);

		curlProcess.stdout.on("data", (buffer: Buffer) => {
			const data = JSON.parse(buffer.toString());
			resolve(data)
		});

		let stderr = "";

		curlProcess.stderr.on("data", (buffer: Buffer) => {
			stderr += buffer.toString();
		});

		curlProcess.on("exit", (code: number) => {
			if (code != 0) {
				reject("exited with exit code " + code + "; stderr:\n" + stderr)
			}
		});
	})
}

export async function test() {
	const response = await makeRequest({
		model: "any string works here",
		messages: [
			{
				role: "user",
				content: "Oh hey, there you are! You're awake."
			}
		],
		temperature: 1.0,
		max_tokens: 50,
	});
	console.log(response.choices[0].message.content);
}
