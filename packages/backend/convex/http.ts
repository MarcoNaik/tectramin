import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await req.text();

    const timestampNumber = parseInt(svixTimestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampNumber) > 300) {
      return new Response("Timestamp too old", { status: 400 });
    }

    const signedContent = `${svixId}.${svixTimestamp}.${body}`;
    const secretBytes = Uint8Array.from(
      atob(webhookSecret.replace("whsec_", "")),
      (c) => c.charCodeAt(0)
    );

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedContent)
    );
    const expectedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signatureBytes))
    );

    const signatures = svixSignature.split(" ");
    const isValid = signatures.some((sig) => {
      const [version, signature] = sig.split(",");
      return version === "v1" && signature === expectedSignature;
    });

    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(body);
    const eventType = payload.type as string;

    if (eventType === "user.created" || eventType === "user.updated") {
      const data = payload.data;
      const email = data.email_addresses?.[0]?.email_address ?? "";
      const fullName =
        [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined;

      await ctx.runMutation(internal.clerk.syncFromWebhook, {
        clerkId: data.id,
        email,
        fullName,
      });
    }

    if (eventType === "user.deleted") {
      await ctx.runMutation(internal.clerk.deleteFromWebhook, {
        clerkId: payload.data.id,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
