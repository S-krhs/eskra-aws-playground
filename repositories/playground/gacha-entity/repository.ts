// In scope: reading GachaEntity rows keyed by poolKey
// Out of scope: drawing, interpreting draw weights, message assembly, outbound sending
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

export const gachaEntityRepository = {
	/** Validates the candidates stored in a pool and returns them in a stable order. */
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
