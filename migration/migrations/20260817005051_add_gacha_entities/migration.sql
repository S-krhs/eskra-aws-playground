-- CreateTable
CREATE TABLE "playground"."gacha_entities" (
    "pool_key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "rarity" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "gacha_entities_pkey" PRIMARY KEY ("pool_key", "name"),
    CONSTRAINT "gacha_entities_pool_key_kebab_check" CHECK ("pool_key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT "gacha_entities_rarity_upper_snake_check" CHECK ("rarity" ~ '^[A-Z0-9]+(_[A-Z0-9]+)*$')
);
