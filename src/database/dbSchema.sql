DROP TABLE IF EXISTS "public"."auth_accounts";
CREATE TABLE "public"."auth_accounts" (
  "id" SERIAL,
  "email" varchar(255),
  "mobilePhone" varchar(32),
  "passwordHash" varchar(255),
  "salt" varchar(255),
  "hashCheck" varchar(255),
  "emailVerificationCode" varchar(64),
  "isEmailVerified" bool,
  "mobileVerificationCode" int2,
  "isMobileVerified" bool,
  "passwordChangeRequired" bool,
  "passwordChangedAt" timestamp(6),
  "isBanned" bool,
  "passwordResetCode" varchar(255),
  "passwordResetAt" timestamp(6),
  "lastLoginAt" timestamp(6),
  "lastLoginProvider" varchar(255),
  "isTwoFaEnabled" bool,
  "twoFaSecret" varchar(255),
  "twoFaCode" varchar(255),
  "isCreatedLocally" bool,
  "isDeleted" bool,
   "accountRestoreCode" varchar(255),
  "createdBy" int4 NOT NULL,
  "createdAt" timestamp(6) DEFAULT now(),
  "modifiedBy" int4,
  "modifiedAt" timestamp(6), 
  "deletedAt" timestamp(6),
  "restoredAt" timestamp(6)
)
;

DROP TABLE IF EXISTS "public"."auth_oauth";
CREATE TABLE "public"."auth_oauth" (
  "id" SERIAL,
  "provider" varchar(255),
  "accountId" int4 NOT NULL,
  "user_id" varchar(255),
  "email" varchar(255),
  "given_name" varchar(255),
  "family_name" varchar(255),
  "name" varchar(255),
  "picture" text,
   "refresh_token" text,
  "access_token" text,
  "createdBy" int4 NOT NULL,
  "createdAt" timestamp(6) DEFAULT now(),
  "modifiedBy" int4,
  "modifiedAt" timestamp(6) 
)
;

DROP TABLE IF EXISTS "public"."auth_roles";
CREATE TABLE "public"."auth_roles" (
  "id" int4 NOT NULL,
  "name" varchar(50),
  "createdBy" int4 NOT NULL,
  "createdAt" timestamp(6) DEFAULT now(),
  "modifiedBy" int4,
  "modifiedAt" timestamp(6)
)
;

DROP TABLE IF EXISTS "public"."auth_users";
CREATE TABLE "public"."auth_users" (
  "id" SERIAL,
  "accountId" int4,
  "firstName" varchar(32),
  "middleName" varchar(32),
  "lastName" varchar(32),
  "picture" varchar(255),
  "isVerified" bool,
  "createdBy" int4 NOT NULL,
  "createdAt" timestamp(6) DEFAULT now(),
  "modifiedBy" int4,
  "modifiedAt" timestamp(6)
)
;

DROP TABLE IF EXISTS "public"."general_config";
CREATE TABLE "public"."general_config" (
  "id" SERIAL,
  "param" jsonb,
  "createdBy" int4 NOT NULL,
  "createdAt" timestamp(6) DEFAULT now(),
  "modifiedBy" int4,
  "modifiedAt" timestamp(6)
)
;

DROP TABLE IF EXISTS "public"."user_genders";
CREATE TABLE "public"."user_genders" (
  "id" int2 NOT NULL,
  "name" varchar(255),
  "createdBy" int4 NOT NULL,
  "createdAt" timestamp(6) DEFAULT now(),
  "modifiedBy" int4,
  "modifiedAt" timestamp(6)
)
;

DROP TABLE IF EXISTS "public"."user_profile";
CREATE TABLE "public"."user_profile" (
  "id" SERIAL,
  "userId" int4 NOT NULL,
  "genderId" int2,
  "birthday" date,
  "bio" text,
  "linkedInUrl" varchar(255),
  "createdBy" int4 NOT NULL,
  "createdAt" timestamp(6) DEFAULT now(),
  "modifiedBy" int4,
  "modifiedAt" timestamp(6)
)
;

DROP TABLE IF EXISTS "public"."user_to_role";
CREATE TABLE "public"."user_to_role" (
  "userId" int4 NOT NULL,
  "roleId" int4 NOT NULL,
  "createdBy" int4 NOT NULL,
  "createdAt" timestamp(6) DEFAULT now(),
  "modifiedBy" int4,
  "modifiedAt" timestamp(6)
)
;

ALTER TABLE "public"."auth_accounts" ADD CONSTRAINT "auth_accounts_email_key" UNIQUE ("email");
ALTER TABLE "public"."auth_accounts" ADD CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."auth_roles" ADD CONSTRAINT "auth_roles_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."auth_users" ADD CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."general_config" ADD CONSTRAINT "general_config_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."user_genders" ADD CONSTRAINT "user_genders_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."user_profile" ADD CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."user_to_role" ADD CONSTRAINT "auth_user_to_role_pkey" PRIMARY KEY ("userId", "roleId");
ALTER TABLE "public"."auth_oauth" ADD CONSTRAINT "fk_auth_oauth_auth_accounts_1" FOREIGN KEY ("accountId") REFERENCES "public"."auth_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."auth_users" ADD CONSTRAINT "fk_auth_users_auth_accounts_1" FOREIGN KEY ("accountId") REFERENCES "public"."auth_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."user_profile" ADD CONSTRAINT "fk_user_profile_auth_users_1" FOREIGN KEY ("userId") REFERENCES "public"."auth_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."user_profile" ADD CONSTRAINT "fk_user_profile_user_genders_1" FOREIGN KEY ("genderId") REFERENCES "public"."user_genders" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."user_to_role" ADD CONSTRAINT "fk_user_to_role_auth_roles_1" FOREIGN KEY ("roleId") REFERENCES "public"."auth_roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."user_to_role" ADD CONSTRAINT "fk_user_to_role_auth_users_1" FOREIGN KEY ("userId") REFERENCES "public"."auth_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
