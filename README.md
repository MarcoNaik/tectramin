# Tectramin

Offline-first field service application with real-time sync between mobile and web platforms.

## Quick Start

```bash
npm install

npm run dev
```

This starts all three packages concurrently:
- **Web**: http://localhost:3000 (Next.js dashboard)
- **Native**: Expo dev server (scan QR with Expo Go)
- **Backend**: Convex sync (watches for changes)

### Environment Variables

Create `.env.local` in each app:

**apps/web/.env.local**
```
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
CLERK_SECRET_KEY=<your-clerk-secret>
```

**apps/native/.env**
```
EXPO_PUBLIC_CONVEX_URL=<your-convex-url>
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
```

**packages/backend/.env.local**
```
CLERK_JWT_ISSUER_DOMAIN=<your-clerk-domain>
```

## Architecture

```
tectramin/
├── apps/
│   ├── web/              # Next.js 15 + React 19 dashboard
│   └── native/           # Expo 54 + React Native mobile app
└── packages/
    └── backend/          # Convex shared backend
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CONVEX BACKEND                          │
│                    (Single Source of Truth)                     │
└─────────────────────────────────────────────────────────────────┘
         │                                          │
         │ Real-time queries                        │ Sync mutations
         │                                          │
         ▼                                          ▼
┌─────────────────────┐                 ┌─────────────────────────┐
│     WEB APP         │                 │      NATIVE APP         │
│  (Next.js + Clerk)  │                 │   (Expo + Clerk)        │
│                     │                 │                         │
│  Direct Convex      │                 │  ┌───────────────────┐  │
│  queries/mutations  │                 │  │  SQLite (Drizzle) │  │
│                     │                 │  │  Local Database   │  │
│                     │                 │  └─────────┬─────────┘  │
│                     │                 │            │            │
│                     │                 │  ┌─────────▼─────────┐  │
│                     │                 │  │    SyncService    │  │
│                     │                 │  │  Push ↔ Pull      │  │
│                     │                 │  └───────────────────┘  │
└─────────────────────┘                 └─────────────────────────┘
```

## Offline-First Architecture (Native)

The mobile app works fully offline with automatic sync when connectivity returns.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **clientId** | UUID generated on device for offline creates. Links local ↔ server records. |
| **syncStatus** | `"pending"` or `"synced"` - tracks whether record has been pushed to server |
| **SyncQueue** | Persistent operation journal that survives app restarts |
| **Mobile-always-wins** | On conflict, mobile data takes precedence |

### Write Flows

**Online Mode:**
```
User Action → Convex Mutation → Success → Update SQLite (synced)
                              → Failure → Fallback to Offline Mode
```

**Offline Mode:**
```
User Action → SQLite Insert (pending) → SyncQueue Entry → Push on Reconnect
```

### Sync Cycle

1. **Push**: Process SyncQueue operations → call `api.sync.upsertTask` → clear queue
2. **Pull**: Call `api.sync.getTaskChangesSince` → merge to SQLite (skip pending items)
3. **Repeat**: Every 30 seconds when online

## Adding New Features

### 1. Add Convex Schema

```typescript
// packages/backend/convex/schema.ts
export default defineSchema({
  inspections: defineTable({
    clientId: v.string(),
    userId: v.string(),
    siteId: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed")),
    notes: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_client_id", ["clientId"])
    .index("by_user_and_updated", ["userId", "updatedAt"]),
});
```

### 2. Add Convex Functions

```typescript
// packages/backend/convex/inspections.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { userId: v.string() },
  returns: v.array(/* ... */),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inspections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
```

### 3. Add Sync Functions

```typescript
// packages/backend/convex/sync.ts
export const upsertInspection = mutation({
  args: {
    clientId: v.string(),
    userId: v.string(),
    // ... other fields
  },
  returns: v.id("inspections"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("inspections")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("inspections", args);
  },
});
```

### 4. Add SQLite Schema (Native)

```typescript
// apps/native/src/db/schema.ts
export const inspections = sqliteTable("inspections", {
  clientId: text("clientId").primaryKey(),
  serverId: text("serverId"),
  userId: text("userId").notNull(),
  siteId: text("siteId").notNull(),
  status: text("status", { enum: ["pending", "completed"] }).notNull(),
  notes: text("notes").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  syncStatus: text("syncStatus", { enum: ["pending", "synced"] }).default("pending"),
});
```

Then run:
```bash
cd apps/native && npx drizzle-kit generate
```

### 5. Create Hook (Native)

Follow the pattern in `apps/native/src/hooks/useTasks.ts`:
- Use `useLiveQuery` for real-time local reads
- Handle online vs offline writes
- Add to SyncQueue for offline operations

## Technology Stack

| Layer | Web | Native | Backend |
|-------|-----|--------|---------|
| Framework | Next.js 15 | Expo 54 | Convex |
| React | 19 | 18.3 | - |
| Auth | Clerk | Clerk | JWT validation |
| State | Convex hooks | SQLite + Drizzle | - |
| Styling | Tailwind | StyleSheet | - |
| Navigation | App Router | React Navigation | - |

## Project Structure

```
apps/web/
├── src/app/
│   ├── ConvexClientProvider.tsx   # Auth + Convex setup
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Main page

apps/native/
├── src/
│   ├── db/
│   │   ├── schema.ts              # Drizzle SQLite schema
│   │   └── migrations/            # Auto-generated SQL
│   ├── hooks/
│   │   ├── useTasks.ts            # CRUD + offline support
│   │   ├── useSyncStatus.ts       # Sync state subscription
│   │   └── useNetworkStatus.ts    # Network state subscription
│   ├── providers/
│   │   ├── DatabaseProvider.tsx   # SQLite initialization
│   │   ├── SyncProvider.tsx       # Sync orchestration
│   │   └── OfflineProvider.tsx    # Combined provider
│   ├── sync/
│   │   ├── SyncService.ts         # Main orchestrator
│   │   ├── SyncQueue.ts           # Operation journal
│   │   ├── SyncPush.ts            # Local → Server
│   │   ├── SyncPull.ts            # Server → Local
│   │   └── NetworkMonitor.ts      # Connectivity detection
│   └── screens/
│       └── HomeScreen.tsx         # Main UI

packages/backend/convex/
├── schema.ts                      # Database schema
├── tasks.ts                       # Public task CRUD
└── sync.ts                        # Sync mutations/queries
```

## Commands Reference

```bash
npm run dev              # Start all packages
npm run build            # Build all packages
npm run lint             # Lint all packages

cd apps/web
npm run dev              # Web only (localhost:3000)

cd apps/native
npx expo start           # Native with Expo
npx drizzle-kit generate # Generate SQLite migrations

cd packages/backend
npx convex dev           # Sync Convex functions
npx convex deploy        # Deploy to production
```
