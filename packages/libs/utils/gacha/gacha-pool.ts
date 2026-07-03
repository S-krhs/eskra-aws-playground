// やること: レアリティ定義からガチャ箱を作り、候補の追加と抽選を行う
// やらないこと: app 固有の候補定義、外部送信、メッセージ生成を扱う

/** ガチャの候補。利用側は rarity に加えて任意のプロパティを持たせられる。 */
export type GachaEntry<TRarity extends string = string> = {
	rarity: TRarity;
};

/** entry 型から取り出した rarity union。 */
type RarityOf<TEntry extends GachaEntry> = TEntry["rarity"];

/** ガチャ抽選を行う公開 API。 */
export interface Gacha<TEntry extends GachaEntry<string>> {
	draw(): TEntry;
}

/** GachaPool の初期設定。 */
export interface GachaPoolOptions<TEntry extends GachaEntry> {
	rarities: readonly RarityOf<TEntry>[];
	rarityWeights: Readonly<Record<RarityOf<TEntry>, number>>;
	random?: () => number;
}

/** 正の weight を持つレアリティ定義。 */
interface WeightedRarity<TRarity extends string> {
	rarity: TRarity;
	weight: number;
}

/** 累積 weight を持つ抽選用レアリティ定義。 */
interface DrawableRarity<TRarity extends string>
	extends WeightedRarity<TRarity> {
	upperBound: number;
}

/**
 * レアリティごとの weight で候補 entry を抽選するガチャ箱。
 *
 * weight はパーセントではなく相対値として扱う。
 * entry は rarity を持っていれば、利用側の任意のプロパティを含められる。
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

	/** レアリティ定義を検証し、空のガチャ箱を作る。 */
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

	/** 候補 entry をまとめて追加する。 */
	public addEntries(entries: readonly TEntry[]): void {
		for (const entry of entries) {
			const entriesForRarity = this.entriesByRarity.get(entry.rarity) ?? [];
			entriesForRarity.push(entry);
			this.entriesByRarity.set(entry.rarity, entriesForRarity);
		}

		this.updateDrawableRarities();
	}

	/** 抽選された entry を返す。 */
	public draw(): TEntry {
		const rarity = this.pickRarity();
		const entries = this.entriesByRarity.get(rarity);

		if (!entries?.length) {
			throw new Error("ガチャの抽選可能な候補を 1 つ以上設定してください");
		}

		return this.pickEntry(entries);
	}

	/** 候補 entry があるレアリティだけを抽選対象として正規化する。 */
	private updateDrawableRarities(): void {
		const drawableRarities = this.weightedRarities.filter(
			(weightedRarity) =>
				(this.entriesByRarity.get(weightedRarity.rarity)?.length ?? 0) > 0,
		);

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

	/** 候補が入っているレアリティの中から weight に従って 1 つ選ぶ。 */
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

	/** 同じレアリティの候補 entry から 1 つ選ぶ。 */
	private pickEntry(entries: readonly TEntry[]): TEntry {
		const randomValue = this.random();
		this.assertRandomValue(randomValue);

		const index = Math.floor(randomValue * entries.length);

		return entries[index];
	}

	/** 乱数値が 0 以上 1 未満であることを検証する。 */
	private assertRandomValue(value: number): void {
		if (!Number.isFinite(value) || value < 0 || value >= 1) {
			throw new Error("ガチャの random は 0 以上 1 未満の数値を返してください");
		}
	}
}
