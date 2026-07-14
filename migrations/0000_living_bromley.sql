CREATE TABLE "color_role" (
	"guild_id" text NOT NULL,
	"hex" text NOT NULL,
	"role_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "color_role_guild_id_hex_pk" PRIMARY KEY("guild_id","hex")
);
--> statement-breakpoint
CREATE TABLE "user_color" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_color_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
CREATE INDEX "user_color_role_idx" ON "user_color" USING btree ("guild_id","role_id");