// In scope: interaction body の parse と custom_id からのボタン選択情報の解釈
// Out of scope: メッセージ payload の build、署名検証、業務ルール、HTTP 通信
import { z } from "zod";

import { CUSTOM_ID_SEPARATOR, type DiscordChoiceDefinition } from "./choice.js";

/** Discord interaction type。 */
export const DISCORD_INTERACTION_TYPES = {
	PING: 1,
	MESSAGE_COMPONENT: 3,
	APPLICATION_COMMAND_AUTOCOMPLETE: 4,
} as const;

/** Parse 済み Discord interaction。 */
export interface DiscordInteraction {
	type: number;
	customId?: string;
	pressedUserId?: string;
}

/** Discord interaction のボタン選択情報。 */
export interface DiscordChoiceSelection {
	choiceId: string;
	choiceLabel: string;
	pressedUserId: string;
	targetUserId: string;
}

const interactionBodySchema = z.object({
	type: z.number(),
	data: z.object({ custom_id: z.string().optional() }).optional(),
	member: z
		.object({ user: z.object({ id: z.string() }).optional() })
		.optional(),
	user: z.object({ id: z.string() }).optional(),
});

/** JSON body を Discord interaction として parse する。 */
export const parseInteraction = (
	rawBody: string,
): DiscordInteraction | undefined => {
	let json: unknown;
	try {
		json = JSON.parse(rawBody) as unknown;
	} catch {
		return undefined;
	}

	const parsed = interactionBodySchema.safeParse(json);
	if (!parsed.success) {
		return undefined;
	}

	return {
		type: parsed.data.type,
		customId: parsed.data.data?.custom_id,
		pressedUserId: parsed.data.member?.user?.id ?? parsed.data.user?.id,
	};
};

/** Parse 済み interaction と送信時の定義からボタン選択情報を解決する。 */
export const resolveChoice = (
	interaction: DiscordInteraction,
	definition: DiscordChoiceDefinition,
): DiscordChoiceSelection | undefined => {
	if (!interaction.customId || !interaction.pressedUserId) {
		return undefined;
	}

	const parts = interaction.customId.split(CUSTOM_ID_SEPARATOR);
	if (parts.length !== 3) {
		return undefined;
	}

	const [customIdPrefix, targetUserId, choiceId] = parts;
	if (customIdPrefix !== definition.customIdPrefix || !targetUserId) {
		return undefined;
	}

	const choice = definition.choices.find((candidate) => {
		return candidate.id === choiceId;
	});
	if (!choice) {
		return undefined;
	}

	return {
		choiceId: choice.id,
		choiceLabel: choice.label,
		pressedUserId: interaction.pressedUserId,
		targetUserId,
	};
};
