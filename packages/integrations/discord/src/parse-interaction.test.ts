import { describe, expect, it } from "vitest";

import { parseInteraction } from "./parse-interaction.js";

describe("parseInteraction", () => {
	it("parses a PING interaction", () => {
		expect(parseInteraction('{"type":1}')).toEqual({ kind: "ping" });
	});

	it("parses an application command into its command and execution context", () => {
		expect(
			parseInteraction(
				'{"type":2,"data":{"name":"hello"},"user":{"id":"123"}}',
			),
		).toEqual({
			kind: "application-command",
			userId: "123",
			command: { name: "hello", options: [] },
			context: { kind: "direct-message" },
		});
	});

	it("keeps an unsupported option as uninterpreted instead of invalidating the whole command", () => {
		expect(
			parseInteraction(
				'{"type":2,"data":{"name":"search","options":[{"type":3,"name":"query","value":"hello"}]},"user":{"id":"123"}}',
			),
		).toMatchObject({
			kind: "application-command",
			command: {
				name: "search",
				options: [{ kind: "unsupported", discordType: 3, name: "query" }],
			},
		});
	});

	it("doesn't parse a known option type whose value/options break its contract", () => {
		expect(
			parseInteraction(
				'{"type":2,"data":{"name":"broken","options":[{"type":1,"name":"subcommand","value":"invalid"}]},"user":{"id":"123"}}',
			),
		).toBeUndefined();
		expect(
			parseInteraction(
				'{"type":2,"data":{"name":"broken","options":[{"type":6,"name":"target","value":"123","options":[]}]},"user":{"id":"123"}}',
			),
		).toBeUndefined();
	});

	it("parses a guild command's location, invoker, and subcommand option", () => {
		expect(
			parseInteraction(
				JSON.stringify({
					type: 2,
					guild_id: "111",
					channel_id: "222",
					member: { user: { id: "333" } },
					data: {
						name: "example",
						options: [
							{
								type: 1,
								name: "assign",
								options: [{ type: 6, name: "member", value: "444" }],
							},
						],
					},
				}),
			),
		).toEqual({
			kind: "application-command",
			userId: "333",
			command: {
				name: "example",
				options: [
					{
						kind: "subcommand",
						name: "assign",
						options: [{ kind: "user", name: "member", userId: "444" }],
					},
				],
			},
			context: {
				kind: "guild",
				guildId: "111",
				channelId: "222",
			},
		});
	});

	it("converts a message component into its raw custom_id and the acting user (guild member)", () => {
		expect(
			parseInteraction(
				'{"type":3,"data":{"custom_id":"test-choice:123:yes"},"member":{"user":{"id":"456"}}}',
			),
		).toEqual({
			kind: "message-component",
			customId: "test-choice:123:yes",
			userId: "456",
		});
	});

	it("takes the top-level user ID for a DM component", () => {
		expect(
			parseInteraction(
				'{"type":3,"data":{"custom_id":"test-choice:123:no"},"user":{"id":"123"}}',
			),
		).toEqual({
			kind: "message-component",
			customId: "test-choice:123:no",
			userId: "123",
		});
	});

	it("keeps custom_id as the raw string, without interpreting its convention", () => {
		expect(
			parseInteraction(
				'{"type":3,"data":{"custom_id":"invalid-custom-id"},"user":{"id":"123"}}',
			),
		).toEqual({
			kind: "message-component",
			customId: "invalid-custom-id",
			userId: "123",
		});
	});

	it("doesn't confuse an unsupported interaction type with a malformed request", () => {
		expect(
			parseInteraction('{"type":99,"data":{"options":"unknown-shape"}}'),
		).toEqual({
			kind: "unsupported",
			discordType: 99,
		});
	});

	it("doesn't parse malformed JSON or an invalid interaction structure", () => {
		expect(parseInteraction("not-a-json")).toBeUndefined();
		expect(parseInteraction('{"type":"1"}')).toBeUndefined();
		expect(parseInteraction('{"type":2}')).toBeUndefined();
		expect(
			parseInteraction('{"type":2,"data":{"name":"hello"}}'),
		).toBeUndefined();
		expect(
			parseInteraction(
				'{"type":4,"data":{"name":"hello"},"user":{"id":"123"}}',
			),
		).toEqual({ kind: "autocomplete" });
		expect(parseInteraction('{"type":4}')).toBeUndefined();
		expect(
			parseInteraction('{"type":3,"data":{"custom_id":"test-choice:123:yes"}}'),
		).toBeUndefined();
	});
});
