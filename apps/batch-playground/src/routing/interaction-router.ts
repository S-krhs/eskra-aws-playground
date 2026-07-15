// In scope: ボタン押下 interaction の custom_id prefix から担当 feature を解決し、応答内容へ変換する
// Out of scope: 署名検証、Lambda イベント解釈、Discord 応答 payload の組み立てを行う
import {
	buildNotTargetEphemeralContent,
	buildSelectedUpdateContent,
	resolveInteractionSelection,
} from "../features/play-check-reminder/interaction-selection.js";
import { REMINDER_CUSTOM_ID_PREFIX } from "../features/play-check-reminder/reminder-settings.js";

/** custom_id は `<prefix>:<feature 固有 payload>` 形式。prefix で担当 feature を判別する。 */
const CUSTOM_ID_PREFIX_SEPARATOR = ":";

/** ボタン押下 interaction への応答内容。Discord 応答 payload への変換は job が担う。 */
export type InteractionReply =
	| { kind: "update-message"; content: string }
	| { kind: "ephemeral"; content: string }
	| { kind: "unsupported" };

/** prefix を除いた payload と押下ユーザー ID から応答内容を作る feature ハンドラー。 */
type InteractionComponentHandler = (
	payload: string,
	pressedUserId: string,
) => InteractionReply;

const playCheckReminderHandler: InteractionComponentHandler = (
	payload,
	pressedUserId,
) => {
	const selection = resolveInteractionSelection(payload, pressedUserId);

	switch (selection.kind) {
		case "selected":
			return {
				kind: "update-message",
				content: buildSelectedUpdateContent(
					selection.targetUserId,
					selection.choiceLabel,
				),
			};
		case "not-target":
			return {
				kind: "ephemeral",
				content: buildNotTargetEphemeralContent(selection.targetUserId),
			};
		case "unknown":
			return { kind: "unsupported" };
	}
};

const componentHandlers: Record<string, InteractionComponentHandler> = {
	[REMINDER_CUSTOM_ID_PREFIX]: playCheckReminderHandler,
};

/** custom_id の prefix から担当 feature を解決し、応答内容を作る。 */
export const resolveComponentInteraction = (
	customId: string,
	pressedUserId: string,
): InteractionReply => {
	const separatorIndex = customId.indexOf(CUSTOM_ID_PREFIX_SEPARATOR);
	const prefix =
		separatorIndex === -1 ? customId : customId.slice(0, separatorIndex);
	const handler = componentHandlers[prefix];

	if (!handler || separatorIndex === -1) {
		return { kind: "unsupported" };
	}

	return handler(customId.slice(separatorIndex + 1), pressedUserId);
};
