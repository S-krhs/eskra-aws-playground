// In scope: building a gacha pool from rarity definitions, adding entries, drawing
// Out of scope: app-specific entry definitions, sending anywhere, message generation

/** Implementations can attach any property beyond `rarity`. */
export type GachaEntry<TRarity extends string = string> = {
	rarity: TRarity;
};

type RarityOf<TEntry extends GachaEntry> = TEntry["rarity"];

export interface Gacha<TEntry extends GachaEntry<string>> {
	draw(): TEntry;
}

export interface GachaPoolOptions<TEntry extends GachaEntry> {
	rarities: readonly RarityOf<TEntry>[];
	rarityWeights: Readonly<Record<RarityOf<TEntry>, number>>;
	random?: () => number;
}

interface WeightedRarity<TRarity extends string> {
	rarity: TRarity;
	weight: number;
}

/** `upperBound` is the running cumulative weight `pickRarity` scans against. */
interface DrawableRarity<TRarity extends string>
	extends WeightedRarity<TRarity> {
	upperBound: number;
}

/**
 * Weights are relative, not percentages.
 * An entry just needs a `rarity` — any other properties are the caller's own.
 */
export class GachaPool<TEntry extends GachaEntry = GachaEntry>
	implements Gacha<TEntry>
{
	private drawableRarities: readonly DrawableRarity<RarityOf<TEntry>>[] = [];
	private drawableTotalWeight = 0;
	private readonly entriesByRarity = new Map<RarityOf<TEntry>, TEntry[]>();
	private readonly weightedRarities: readonly WeightedRarity<
		RarityOf<TEntry>
	>[];
	private readonly random: () => number;

	public constructor(options: GachaPoolOptions<TEntry>) {
		if (!options.rarities.length) {
			throw new Error("ガチャの rarity を 1 つ以上設定してください");
		}

		const weightedRarities: WeightedRarity<RarityOf<TEntry>>[] = [];

		for (const rarity of options.rarities) {
			const weight = options.rarityWeights[rarity];

			if (!Number.isFinite(weight) || weight < 0) {
				throw new Error(`ガチャのレアリティ ${rarity} の weight が不正です`);
			}

			if (weight <= 0) {
				continue;
			}

			weightedRarities.push({ rarity, weight });
		}

		this.weightedRarities = weightedRarities;

		this.random = options.random ?? Math.random;
	}

	public addEntries(entries: readonly TEntry[]): void {
		for (const entry of entries) {
			const entriesForRarity = this.entriesByRarity.get(entry.rarity) ?? [];
			entriesForRarity.push(entry);
			this.entriesByRarity.set(entry.rarity, entriesForRarity);
		}

		this.updateDrawableRarities();
	}

	public draw(): TEntry {
		const rarity = this.pickRarity();
		const entries = this.entriesByRarity.get(rarity);

		if (!entries?.length) {
			throw new Error("ガチャの抽選可能な候補を 1 つ以上設定してください");
		}

		return this.pickEntry(entries);
	}

	/** Filters out a rarity with no entries yet, so it can't get drawn with nothing to return. */
	private updateDrawableRarities(): void {
		const drawableRarities = this.weightedRarities.filter((weightedRarity) => {
			return (this.entriesByRarity.get(weightedRarity.rarity)?.length ?? 0) > 0;
		});

		const drawableBoundaries: DrawableRarity<RarityOf<TEntry>>[] = [];
		let cumulativeWeight = 0;

		for (const weightedRarity of drawableRarities) {
			cumulativeWeight += weightedRarity.weight;
			drawableBoundaries.push({
				rarity: weightedRarity.rarity,
				weight: weightedRarity.weight,
				upperBound: cumulativeWeight,
			});
		}

		this.drawableRarities = drawableBoundaries;
		this.drawableTotalWeight = cumulativeWeight;
	}

	private pickRarity(): RarityOf<TEntry> {
		if (this.drawableTotalWeight <= 0) {
			throw new Error("ガチャの抽選可能な候補を 1 つ以上設定してください");
		}

		const randomValue = this.random();
		this.assertRandomValue(randomValue);

		const targetWeight = randomValue * this.drawableTotalWeight;

		for (const weightedRarity of this.drawableRarities) {
			if (targetWeight < weightedRarity.upperBound) {
				return weightedRarity.rarity;
			}
		}

		return this.drawableRarities[this.drawableRarities.length - 1].rarity;
	}

	private pickEntry(entries: readonly TEntry[]): TEntry {
		const randomValue = this.random();
		this.assertRandomValue(randomValue);

		const index = Math.floor(randomValue * entries.length);

		return entries[index];
	}

	/** Contract: `random()` must return a value in [0, 1). */
	private assertRandomValue(value: number): void {
		if (!Number.isFinite(value) || value < 0 || value >= 1) {
			throw new Error("ガチャの random は 0 以上 1 未満の数値を返してください");
		}
	}
}
