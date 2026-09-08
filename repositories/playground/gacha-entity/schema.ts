// In scope: validating a GachaEntity's rarity string
// Out of scope: DB access, drawing, interpreting a poolKey
import { z } from "zod";
import { gachaRarities } from "../shared/literals/gacha-rarity.js";

export const gachaRaritySchema = z.enum(gachaRarities);
