// In scope: ボタン押下 payload と押下ユーザーから選択結果を判定し、応答本文を生成する
// Out of scope: custom_id prefix の判別、署名検証、応答 payload 生成、外部送信を行う
import {
	REMINDER_CHOICES,
	REMINDER_CUSTOM_ID_SEPARATOR,
	REMINDER_QUESTION,
} from "./reminder-settings.js";

/** ボタン押下の判定結果。 */
export type InteractionSelectionResult =
	| { kind: "not-target"; targetUserId: string }
	| { kind: "selected"; choiceLabel: string; targetUserId: string }
	| { kind: "unknown" };

/** prefix を除いた payload(`<targetUserId>:<choiceId>`)と押下ユーザー ID から選択結果を判定する。 */
export const resolveInteractionSelection = (
	payload: string,
	pressedUserId: string,
): InteractionSelectionResult => {
	const parts = payload.split(REMINDER_CUSTOM_ID_SEPARATOR);

	if (parts.length !== 2) {
		return { kind: "unknown" };
	}

	const [targetUserId, choiceId] = parts;

	if (!targetUserId) {
		return { kind: "unknown" };
	}

	const choice = REMINDER_CHOICES.find((candidate) => {
		return candidate.id === choiceId;
	});

	if (!choice) {
		return { kind: "unknown" };
	}

	if (pressedUserId !== targetUserId) {
		return { kind: "not-target", targetUserId };
	}

	return { kind: "selected", choiceLabel: choice.label, targetUserId };
};

/** 選択確定時に元メッセージへ上書きする本文を生成する。 */
export const buildSelectedUpdateContent = (
	targetUserId: string,
	choiceLabel: string,
): string => {
	return `<@${targetUserId}> ${REMINDER_QUESTION}\n**${choiceLabel}** を選択しました`;
};

/** 対象外ユーザーの押下時に本人へだけ見せる本文を生成する。 */
export const buildNotTargetEphemeralContent = (
	targetUserId: string,
): string => {
	return `このリマインダーは <@${targetUserId}> さん専用です。`;
};
