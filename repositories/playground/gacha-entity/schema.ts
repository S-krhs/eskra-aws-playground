// In scope: GachaEntity のレアリティ文字列を検証する
// Out of scope: DB 操作、抽選、poolKey の解釈
import { z } from "zod";
import { gachaRarities } from "../shared/literals/gacha-rarity.js";

/** ガチャ候補のレアリティ schema。 */
export const gachaRaritySchema = z.enum(gachaRarities);
