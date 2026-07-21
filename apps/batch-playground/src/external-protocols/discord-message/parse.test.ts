import { describe, expect, it } from "vitest";

import { parseInteraction, parseInteractionCallback } from "./parse.js";

describe("parseInteraction", () => {
	it("PING interaction を parse する", () => {
		expect(parseInteraction('{"type":1}')).toEqual({ kind: "ping" });
	});

	it("application command を command と実行コンテキストへ分けて parse する", () => {
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

	it("未対応 option は command 全体を不正にせず意味未解釈として保持する", () => {
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

	it("既知 option type の value・options 契約違反は parse しない", () => {
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

	it("guild command の場所・実行者・subcommand option を parse する", () => {
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

	it("message component を custom ID と操作ユーザーへ変換する", () => {
		expect(
			parseInteraction(
				'{"type":3,"data":{"custom_id":"test-choice:123:yes"},"member":{"user":{"id":"456"}}}',
			),
		).toEqual({
			kind: "message-component",
			customId: {
				prefix: "test-choice",
				target: "123",
				action: "yes",
			},
			userId: "456",
		});
	});

	it("DM component ではトップレベルの user ID を取り出す", () => {
		expect(
			parseInteraction(
				'{"type":3,"data":{"custom_id":"test-choice:123:no"},"user":{"id":"123"}}',
			),
		).toEqual({
			kind: "message-component",
			customId: {
				prefix: "test-choice",
				target: "123",
				action: "no",
			},
			userId: "123",
		});
	});

	it("target のない custom_id も共通規約で parse する", () => {
		expect(
			parseInteraction(
				'{"type":3,"data":{"custom_id":"refresh-panel::refresh"},"user":{"id":"123"}}',
			),
		).toEqual({
			kind: "message-component",
			customId: { prefix: "refresh-panel", action: "refresh" },
			userId: "123",
		});
	});

	it("共通規約に合わない custom_id は未解釈として保持する", () => {
		expect(
			parseInteraction(
				'{"type":3,"data":{"custom_id":"invalid-custom-id"},"user":{"id":"123"}}',
			),
		).toEqual({
			kind: "message-component",
			customId: null,
			userId: "123",
		});
	});

	it("未対応の interaction type を不正リクエストと混同しない", () => {
		expect(
			parseInteraction('{"type":99,"data":{"options":"unknown-shape"}}'),
		).toEqual({
			kind: "unsupported",
			discordType: 99,
		});
	});

	it("callback として application_id と token を取り出す", () => {
		expect(
			parseInteractionCallback(
				'{"type":2,"application_id":"999","token":"abc-token","data":{"name":"hello"}}',
			),
		).toEqual({ applicationId: "999", token: "abc-token" });
	});

	it("application_id か token を欠く body の callback は取り出さない", () => {
		expect(
			parseInteractionCallback('{"type":2,"token":"abc"}'),
		).toBeUndefined();
		expect(
			parseInteractionCallback('{"type":2,"application_id":"999","token":""}'),
		).toBeUndefined();
		expect(parseInteractionCallback("not-a-json")).toBeUndefined();
	});

	it("不正な JSON・interaction 構造は parse しない", () => {
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
