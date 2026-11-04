-- AlterTable
ALTER TABLE "playground"."discord_user_settings" DROP CONSTRAINT "discord_user_settings_pkey",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "discord_user_settings_pkey" PRIMARY KEY ("id");
