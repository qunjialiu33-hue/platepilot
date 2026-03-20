import { pgTable, varchar, boolean, timestamp, jsonb, integer, text, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  image: varchar("image", { length: 512 }),
  emailVerified: boolean("email_verified").default(false),
  passwordHash: varchar("password_hash", { length: 255 }),
  isPro: boolean("is_pro").default(false),
  usageCount: integer("usage_count").default(0),
  usageResetDate: timestamp("usage_reset_date").defaultNow().notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  age: integer("age"),
  gender: varchar("gender", { length: 10 }),
  height: integer("height"),
  weight: integer("weight"),
  targetWeight: integer("target_weight"),
  activityLevel: varchar("activity_level", { length: 50 }),
  dietaryRestrictions: varchar("dietary_restrictions", { length: 255 }),
  fitnessGoal: varchar("fitness_goal", { length: 50 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  expiresAt: timestamp("expires_at"),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 255 }),
  userAgent: varchar("user_agent", { length: 512 }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: varchar("id", { length: 255 }).primaryKey(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: varchar("access_token", { length: 512 }),
  refreshToken: varchar("refresh_token", { length: 512 }),
  idToken: varchar("id_token", { length: 512 }),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: varchar("scope", { length: 512 }),
  password: varchar("password", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verifications = pgTable("verifications", {
  id: varchar("id", { length: 255 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mealAudits = pgTable("meal_audits", {
  id: varchar("id", { length: 255 }).$defaultFn(() => crypto.randomUUID()).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  score: integer("score"),
  resultJson: jsonb("result_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  mealAudits: many(mealAudits),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const mealAuditsRelations = relations(mealAudits, ({ one }) => ({
  user: one(users, {
    fields: [mealAudits.userId],
    references: [users.id],
  }),
}));
