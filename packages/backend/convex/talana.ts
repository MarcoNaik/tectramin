import { internalMutation, mutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

interface TalanaPersona {
  id: number;
  rut: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email?: string;
  detalles?: Array<{ email?: string }>;
}

export const syncFromTalana = internalAction({
  args: {},
  returns: v.object({ created: v.number(), updated: v.number() }),
  handler: async (ctx) => {
    const token = process.env.TALANA_API_TOKEN;
    if (!token) {
      throw new Error("TALANA_API_TOKEN environment variable is not set");
    }

    const response = await fetch("https://talana.com/es/api/persona/", {
      headers: { Authorization: `Token ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Talana API error: ${response.status} ${response.statusText}`);
    }

    const employees: TalanaPersona[] = await response.json();

    let created = 0;
    let updated = 0;

    for (const emp of employees) {
      const fullName = [emp.nombre, emp.apellidoPaterno, emp.apellidoMaterno]
        .filter(Boolean)
        .join(" ")
        .trim();

      const email =
        emp.email ?? emp.detalles?.[0]?.email ?? `${emp.rut}@placeholder.local`;

      const result = await ctx.runMutation(internal.talana.upsertFromTalana, {
        talanaId: emp.id,
        rut: emp.rut,
        fullName,
        email,
      });

      if (result.wasCreated) {
        created++;
      } else {
        updated++;
      }
    }

    return { created, updated };
  },
});

export const upsertFromTalana = internalMutation({
  args: {
    talanaId: v.number(),
    rut: v.string(),
    fullName: v.string(),
    email: v.string(),
  },
  returns: v.object({ id: v.id("users"), wasCreated: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_talana_id", (q) => q.eq("talanaId", args.talanaId))
      .unique();

    const now = Date.now();

    if (existing) {
      if (!existing.clerkId.startsWith("talana_")) {
        return { id: existing._id, wasCreated: false };
      }
      await ctx.db.patch(existing._id, {
        fullName: args.fullName,
        email: args.email,
        rut: args.rut,
        updatedAt: now,
      });
      return { id: existing._id, wasCreated: false };
    }

    const id = await ctx.db.insert("users", {
      clerkId: `talana_${args.talanaId}`,
      email: args.email,
      fullName: args.fullName,
      rut: args.rut,
      talanaId: args.talanaId,
      role: "field_worker",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return { id, wasCreated: true };
  },
});

export const triggerSync = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.talana.syncFromTalana, {});
    return null;
  },
});
