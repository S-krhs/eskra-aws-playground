// In scope: UMA ワンドロのお題候補の静的カタログを定義する
// Out of scope: お題選択、メッセージ生成、外部送信を行う
import type { TopicEntry } from "./types.js";

export const topicEntries: readonly TopicEntry[] = [
	{ rarity: "COMMON", name: "ホッコータルマエ" },
	{ rarity: "RARE", name: "ダイワスカーレット" },
	{ rarity: "RARE", name: "アーモンドアイ" },
	{ rarity: "RARE", name: "サトノダイヤモンド" },
	{ rarity: "RARE", name: "ナリタトップロード" },
];
