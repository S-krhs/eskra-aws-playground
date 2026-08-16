// In scope: poolKey で識別する GachaEntity の取得
// Out of scope: 抽選、抽選重みの解釈、メッセージ生成、外部送信
import { getPrismaClient } from "../../db/client.js";
import { gachaRaritySchema } from "./schema.js";
import type { FindGachaEntitiesInput, GachaEntity } from "./types.js";

interface GachaEntityRow {
	name: string;
	rarity: string;
}

const gachaEntitySelect = {
	name: true,
	rarity: true,
} as const;

const toGachaEntity = (row: GachaEntityRow): GachaEntity => {
	return {
		rarity: gachaRaritySchema.parse(row.rarity),
		name: row.name,
	};
};

/** ガチャ候補の永続化操作。 */
export const gachaEntityRepository = {
	/** pool に登録済みの候補を検証し、安定した順序で返す。 */
	findMany: async (input: FindGachaEntitiesInput): Promise<GachaEntity[]> => {
		const prisma = getPrismaClient();
		const rows = await prisma.gachaEntity.findMany({
			where: { poolKey: input.poolKey },
			orderBy: [{ name: "asc" }],
			select: gachaEntitySelect,
		});

		return rows.map(toGachaEntity);
	},
};
