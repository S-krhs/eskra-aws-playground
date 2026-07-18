-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "playground";

-- CreateTable
CREATE TABLE "playground"."discord_guild_settings" (
    "application_key" VARCHAR(64) NOT NULL,
    "guild_id" VARCHAR(20) NOT NULL,
    "setting_key" VARCHAR(64) NOT NULL,
    "configuration" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "discord_guild_settings_pkey" PRIMARY KEY ("application_key", "guild_id", "setting_key"),
    CONSTRAINT "discord_guild_settings_application_key_kebab_check" CHECK ("application_key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT "discord_guild_settings_guild_id_snowflake_check" CHECK ("guild_id" ~ '^[0-9]+$'),
    CONSTRAINT "discord_guild_settings_setting_key_kebab_check" CHECK ("setting_key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- CreateTable
CREATE TABLE "playground"."discord_user_settings" (
    "application_key" VARCHAR(64) NOT NULL,
    "guild_id" VARCHAR(20) NOT NULL,
    "user_id" VARCHAR(20) NOT NULL,
    "setting_key" VARCHAR(64) NOT NULL,
    "configuration" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "discord_user_settings_pkey" PRIMARY KEY ("application_key", "guild_id", "user_id", "setting_key"),
    CONSTRAINT "discord_user_settings_application_key_kebab_check" CHECK ("application_key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT "discord_user_settings_guild_id_snowflake_check" CHECK ("guild_id" ~ '^[0-9]+$'),
    CONSTRAINT "discord_user_settings_user_id_snowflake_check" CHECK ("user_id" ~ '^[0-9]+$'),
    CONSTRAINT "discord_user_settings_setting_key_kebab_check" CHECK ("setting_key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- CreateIndex
CREATE INDEX "discord_user_settings_application_key_setting_key_idx" ON "playground"."discord_user_settings"("application_key", "setting_key");
