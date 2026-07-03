import { describe, expect, it } from "vitest";

import { type GachaEntry, GachaPool } from "./gacha-pool.js";

type TestRarity = "COMMON" | "RARE" | "LEGENDARY";

type TestEntry = GachaEntry<TestRarity> & {
	id: string;
	name: string;
};

const createSequentialRandom = (
	...values: readonly number[]
): (() => number) => {
	let index = 0;

	return () => {
		const value = values[index];

		if (value === undefined) {
			throw new Error("テスト用 random の値が不足しています");
		}

		index += 1;

		return value;
	};
};

describe("GachaPool", () => {
	it("rarity が空だと作成時にエラーになる", () => {
		expect(
			() =>
				new GachaPool<TestEntry>({
					rarities: [],
					rarityWeights: {
						COMMON: 1,
						RARE: 1,
						LEGENDARY: 1,
					},
				}),
		).toThrow("ガチャの rarity を 1 つ以上設定してください");
	});

	it("不正な weight があると作成時にエラーになる", () => {
		expect(
			() =>
				new GachaPool<TestEntry>({
					rarities: ["COMMON", "RARE", "LEGENDARY"],
					rarityWeights: {
						COMMON: 1,
						RARE: -1,
						LEGENDARY: 1,
					},
				}),
		).toThrow("ガチャのレアリティ RARE の weight が不正です");
	});

	it("候補が空のまま draw するとエラーになる", () => {
		const gacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 9,
				RARE: 1,
				LEGENDARY: 1,
			},
			random: createSequentialRandom(0),
		});

		expect(() => gacha.draw()).toThrow(
			"ガチャの抽選可能な候補を 1 つ以上設定してください",
		);
	});

	it("候補が入っている rarity だけで weight を正規化して抽選する", () => {
		const gacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 9,
				RARE: 1,
				LEGENDARY: 100,
			},
			random: createSequentialRandom(0.95, 0),
		});

		gacha.addEntries([
			{ rarity: "COMMON", id: "common-1", name: "Common" },
			{ rarity: "RARE", id: "rare-1", name: "Rare" },
		]);

		expect(gacha.draw()).toEqual({
			rarity: "RARE",
			id: "rare-1",
			name: "Rare",
		});
	});

	it("rarity の境界値で抽選結果が切り替わる", () => {
		const entries: readonly TestEntry[] = [
			{ rarity: "COMMON", id: "common-1", name: "Common" },
			{ rarity: "RARE", id: "rare-1", name: "Rare" },
		];

		const firstGacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 9,
				RARE: 1,
				LEGENDARY: 0,
			},
			random: createSequentialRandom(0, 0),
		});
		firstGacha.addEntries(entries);

		const justBeforeBoundaryGacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 9,
				RARE: 1,
				LEGENDARY: 0,
			},
			random: createSequentialRandom(0.899999999999, 0),
		});
		justBeforeBoundaryGacha.addEntries(entries);

		const boundaryGacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 9,
				RARE: 1,
				LEGENDARY: 0,
			},
			random: createSequentialRandom(0.9, 0),
		});
		boundaryGacha.addEntries(entries);

		const lastGacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 9,
				RARE: 1,
				LEGENDARY: 0,
			},
			random: createSequentialRandom(0.999999999999, 0),
		});
		lastGacha.addEntries(entries);

		expect(firstGacha.draw()).toEqual(entries[0]);
		expect(justBeforeBoundaryGacha.draw()).toEqual(entries[0]);
		expect(boundaryGacha.draw()).toEqual(entries[1]);
		expect(lastGacha.draw()).toEqual(entries[1]);
	});

	it("同じ rarity 内では entry 単位で抽選する", () => {
		const gacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 1,
				RARE: 0,
				LEGENDARY: 0,
			},
			random: createSequentialRandom(0, 0.74),
		});

		gacha.addEntries([
			{ rarity: "COMMON", id: "common-1", name: "Common 1" },
			{ rarity: "COMMON", id: "common-2", name: "Common 2" },
			{ rarity: "COMMON", id: "common-3", name: "Common 3" },
			{ rarity: "COMMON", id: "common-4", name: "Common 4" },
		]);

		expect(gacha.draw()).toEqual({
			rarity: "COMMON",
			id: "common-3",
			name: "Common 3",
		});
	});

	it("entry の境界値で選ばれる index が切り替わる", () => {
		const entries: readonly TestEntry[] = [
			{ rarity: "COMMON", id: "common-1", name: "Common 1" },
			{ rarity: "COMMON", id: "common-2", name: "Common 2" },
			{ rarity: "COMMON", id: "common-3", name: "Common 3" },
			{ rarity: "COMMON", id: "common-4", name: "Common 4" },
		];

		const firstGacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 1,
				RARE: 0,
				LEGENDARY: 0,
			},
			random: createSequentialRandom(0, 0),
		});
		firstGacha.addEntries(entries);

		const justBeforeSecondEntryGacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 1,
				RARE: 0,
				LEGENDARY: 0,
			},
			random: createSequentialRandom(0, 0.249999999999),
		});
		justBeforeSecondEntryGacha.addEntries(entries);

		const secondEntryBoundaryGacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 1,
				RARE: 0,
				LEGENDARY: 0,
			},
			random: createSequentialRandom(0, 0.25),
		});
		secondEntryBoundaryGacha.addEntries(entries);

		const lastGacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 1,
				RARE: 0,
				LEGENDARY: 0,
			},
			random: createSequentialRandom(0, 0.999999999999),
		});
		lastGacha.addEntries(entries);

		expect(firstGacha.draw()).toEqual(entries[0]);
		expect(justBeforeSecondEntryGacha.draw()).toEqual(entries[0]);
		expect(secondEntryBoundaryGacha.draw()).toEqual(entries[1]);
		expect(lastGacha.draw()).toEqual(entries[3]);
	});

	it("addEntries を複数回呼んでも候補を保持する", () => {
		const gacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 9,
				RARE: 1,
				LEGENDARY: 0,
			},
			random: createSequentialRandom(0.95, 0),
		});

		gacha.addEntries([{ rarity: "COMMON", id: "common-1", name: "Common" }]);
		gacha.addEntries([{ rarity: "RARE", id: "rare-1", name: "Rare" }]);

		expect(gacha.draw()).toEqual({
			rarity: "RARE",
			id: "rare-1",
			name: "Rare",
		});
	});

	it("random が 0 以上 1 未満を返さないとエラーになる", () => {
		const gacha = new GachaPool<TestEntry>({
			rarities: ["COMMON", "RARE", "LEGENDARY"],
			rarityWeights: {
				COMMON: 1,
				RARE: 0,
				LEGENDARY: 0,
			},
			random: createSequentialRandom(1),
		});

		gacha.addEntries([{ rarity: "COMMON", id: "common-1", name: "Common" }]);

		expect(() => gacha.draw()).toThrow(
			"ガチャの random は 0 以上 1 未満の数値を返してください",
		);
	});
});
