// In scope: /play-check-reminder command の実行場所確認、本人設定の更新、callback payload生成
// Out of scope: command routing、DB query、HTTP response の形成
import { playCheckReminderConfigRepository } from "@eskra-aws-playground/repositories/playground/play-check-reminder-config/repository.js";

import {
	type DiscordEphemeralResponsePayload,
	messageFlags,
	responseTypes,
} from "@/external-protocols/discord-message/interaction-response.js";
import type { DiscordInteraction } from "@/external-protocols/discord-message/parse.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";

type PlayCheckReminderCommandResult =
	OperationResult<DiscordEphemeralResponsePayload>;

/** /play-check-reminder command を解決し、呼び出し元だけに結果を返す。 */
export const playCheckReminderCommandOperation = async (
	interaction: DiscordInteraction,
): Promise<PlayCheckReminderCommandResult | undefined> => {
	if (interaction.kind !== "application-command") {
		return undefined;
	}

	if (interaction.context.kind !== "guild" || !interaction.context.channelId) {
		return ephemeralResult("サーバー内のチャンネルから実行してください。");
	}

	const subcommand = interaction.command.options.find((option) => {
		return option.kind === "subcommand";
	});
	if (!subcommand) {
		return undefined;
	}

	if (subcommand.name === "enable") {
		await playCheckReminderConfigRepository.save({
			guildId: interaction.context.guildId,
			channelId: interaction.context.channelId,
			userId: interaction.userId,
		});
		return ephemeralResult(
			"このチャンネルで自分のリマインダーを有効にしました。",
		);
	}

	if (subcommand.name === "disable") {
		const deleted =
			await playCheckReminderConfigRepository.deleteByGuildIdAndUserId(
				interaction.context.guildId,
				interaction.userId,
			);
		return ephemeralResult(
			deleted
				? "自分のリマインダーを無効にしました。"
				: "自分のリマインダーは設定されていません。",
		);
	}

	return undefined;
};

const ephemeralResult = (content: string): PlayCheckReminderCommandResult => {
	return {
		kind: "OK",
		data: {
			type: responseTypes.message,
			data: {
				content,
				flags: messageFlags.ephemeral,
				allowed_mentions: { parse: [] },
			},
		},
	};
};
