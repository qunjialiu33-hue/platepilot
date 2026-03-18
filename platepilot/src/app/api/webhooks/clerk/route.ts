import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to .env");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error: Verification error", {
      status: 400,
    });
  }

  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const email = email_addresses[0]?.email_address;
    const name = first_name && last_name ? `${first_name} ${last_name}` : first_name || last_name || null;

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));

    if (existingUser) {
      // Update existing user
      await db
        .update(users)
        .set({
          email: email || existingUser.email,
          name: name || existingUser.name,
          image: image_url || existingUser.image,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));

      console.log(`User ${id} updated`);
    } else {
      // Create new user
      await db.insert(users).values({
        id,
        email: email || "",
        name,
        image: image_url,
        emailVerified: true,
        isPro: false,
        usageCount: 0,
        usageResetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`User ${id} created`);
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    await db.delete(users).where(eq(users.id, id!));

    console.log(`User ${id} deleted`);
  }

  return new Response("Webhook processed", { status: 200 });
}
