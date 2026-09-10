import { afterEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => {
	return vi.fn();
});

vi.mock("@aws-sdk/client-sqs", () => {
	return {
		SQSClient: class {
			send = send;
		},
		SendMessageBatchCommand: class {
			public constructor(public readonly input: unknown) {}
		},
	};
});

import { SqsMessageSender } from "./sqs-message-sender.js";

describe("SqsMessageSender", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("splits into batches of at most 10", async () => {
		send.mockResolvedValue({});
		const sender = new SqsMessageSender("https://sqs.example.com/queue");
		const messages = Array.from({ length: 23 }, (_, index) => {
			return { id: `message-${index}`, body: { index } };
		});

		await sender.sendMessages(messages);

		expect(send).toHaveBeenCalledTimes(3);
	});

	it("throws with the failed ids when the result has Failed entries", async () => {
		send.mockResolvedValue({ Failed: [{ Id: "message-1" }] });
		const sender = new SqsMessageSender("https://sqs.example.com/queue");

		await expect(
			sender.sendMessages([{ id: "message-1", body: {} }]),
		).rejects.toThrow("message-1");
	});

	it("doesn't call SQS when there are no messages", async () => {
		const sender = new SqsMessageSender("https://sqs.example.com/queue");

		await sender.sendMessages([]);

		expect(send).not.toHaveBeenCalled();
	});
});
