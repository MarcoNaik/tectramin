# Tectramin Monorepo

Field service application with offline-first mobile and real-time web dashboard.

## Domain Model

### Entity Hierarchy
```
customers → faenas (work sites) → workOrders → workOrderDays → assignments (to users)
                                      ↓
services → serviceTaskTemplates → taskTemplates → fieldTemplates
                                      ↓
                              workOrderDayTaskTemplates (which tasks for each day)
                                      ↓
                              taskInstances (filled by mobile) → fieldResponses
```

### Key Entities
| Entity | Purpose | Created By |
|--------|---------|------------|
| `customers` | Companies contracting work | Admin (web) |
| `faenas` | Work sites/locations | Admin (web) |
| `services` | Service templates with default days/people | Admin (web) |
| `taskTemplates` | Checklist definitions | Admin (web) |
| `fieldTemplates` | Field definitions within checklists | Admin (web) |
| `workOrders` | Contracted work at a faena | Admin (web) |
| `workOrderDays` | Each day of work order (assignable unit) | Auto-created from service |
| `workOrderDayAssignments` | User assigned to a day | Admin (web) |
| `taskInstances` | Filled checklist (syncs to mobile) | Mobile user on-demand |
| `fieldResponses` | Individual field answers (syncs to mobile) | Mobile user on-demand |

### Task Instance Creation Flow
Task instances are NOT pre-created. They're created on-demand when mobile user starts a task:
1. Admin creates work order → days + task templates auto-linked
2. Admin assigns users to days
3. Mobile syncs → gets assignments + empty templates
4. User taps "Start Task" → creates `taskInstance` (draft)
5. User fills fields → creates/updates `fieldResponses` (auto-save)
6. User completes → updates `taskInstance.status`

### User Management
Users table syncs from Clerk. Web dashboard has "Sync Current User to Database" button.
- `users.clerkId` = Clerk user ID (e.g., `user_abc123`)
- `users._id` = Convex document ID (used for assignments)
- Sync functions use `clerkUserId` parameter, assignments use `userId` (Convex ID)

### Backend Files
| File | Purpose |
|------|---------|
| `customers.ts` | Customer CRUD |
| `faenas.ts` | Work site CRUD |
| `services.ts` | Service template CRUD + task template linking |
| `taskTemplates.ts` | Checklist template CRUD |
| `fieldTemplates.ts` | Field definition CRUD |
| `workOrders.ts` | Work order CRUD + `createFromService` |
| `workOrderDays.ts` | Day management |
| `assignments.ts` | User ↔ day assignments |
| `taskInstances.ts` | Task instance CRUD + `getWithResponses` |
| `fieldResponses.ts` | Field response CRUD |
| `sync.ts` | Mobile sync functions |
| `users.ts` | User management + `upsertFromClerk` |

### Mobile Hooks
| Hook | Purpose |
|------|---------|
| `useAssignments` | Get user's assigned work order days with task templates |
| `useTaskInstances` | Create/update task instances with offline support |
| `useFieldResponses` | Create/update field responses with auto-save |

### Web Debug Dashboard
`apps/web/src/app/page.tsx` contains a tabbed debug UI for all CRUD operations:
- Customers, Faenas, Task Templates, Services (Routines), Work Orders, Users tabs
- Work Orders tab shows days with user assignments
- Task instances and field responses visible when mobile users fill them

## Development Workflow

### Running the Project
```bash
npm run dev  # Starts web, native, and backend concurrently
```

Individual packages:
- Web: `cd apps/web && npm run dev`
- Native: `cd apps/native && npx expo start`
- Backend: `cd packages/backend && npx convex dev`

### Adding New Features (Full Stack)

1. **Schema First**: Define in `packages/backend/convex/schema.ts`
2. **Backend Functions**: Add queries/mutations in `packages/backend/convex/`
3. **SQLite Schema** (if mobile needs offline): Add to `apps/native/src/db/schema.ts`, run `npx drizzle-kit generate`
4. **Sync Functions**: Add to `packages/backend/convex/sync.ts` for mobile sync
5. **Native Hook**: Create hook in `apps/native/src/hooks/` following `useTaskInstances.ts` pattern
6. **Web UI**: Add components in `apps/web/src/app/`
7. **Native UI**: Add screens in `apps/native/src/screens/`

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `SyncStatusIcon.tsx` |
| Hooks | camelCase with `use` prefix | `useTasks.ts` |
| Providers | PascalCase with `Provider` suffix | `DatabaseProvider.tsx` |
| Screens | PascalCase with `Screen` suffix | `HomeScreen.tsx` |
| Convex functions | camelCase | `tasks.ts`, `sync.ts` |
| SQLite migrations | Auto-generated | `0000_unusual_hardball.sql` |

## Architecture Overview

This is a Turbo monorepo with 3 main packages:

```
tectramin/
├── apps/
│   ├── web/           # Next.js 15 + React 19 web application
│   └── native/        # Expo 53 + React Native mobile app
├── packages/
│   └── backend/       # Convex shared backend (queries, mutations, actions)
```

## Package Interactions

### 1. Shared Backend (`packages/backend`)
The Convex backend is the single source of truth for all data and business logic. Both web and native apps connect to the same Convex deployment.

**Location:** `packages/backend/convex/`
- `schema.ts` - Database schema definitions
- `*.ts` - Query, mutation, and action functions
- `_generated/` - Auto-generated types and API (do not edit)

### 2. Web App (`apps/web`)
Next.js application with App Router, Clerk authentication, and Tailwind CSS.

**Imports Convex functions via:**
```typescript
import { api } from "@packages/backend/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

const data = useQuery(api.tasks.get, { userId });
const createTask = useMutation(api.tasks.create);
```

**Key files:**
- `src/app/ConvexClientProvider.tsx` - Wraps app with Convex + Clerk providers
- `src/middleware.ts` - Clerk authentication middleware

### 3. Native App (`apps/native`)
Expo React Native app with Clerk authentication and React Navigation.

**Imports Convex functions via:**
```typescript
import { api } from "@packages/backend/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

const data = useQuery(api.tasks.get, { userId });
const createTask = useMutation(api.tasks.create);
```

**Key files:**
- `ConvexClientProvider.tsx` - Wraps app with Convex + Clerk providers
- `metro.config.js` - Configured for monorepo workspace resolution

## Authentication Flow

Both apps use Clerk for authentication, integrated with Convex:

1. User signs in via Clerk (web: `@clerk/nextjs`, native: `@clerk/clerk-expo`)
2. Clerk provides JWT tokens
3. `ConvexProviderWithClerk` passes auth to Convex
4. Convex validates JWT via `auth.config.js` (uses `CLERK_JWT_ISSUER_DOMAIN`)
5. Backend functions can access authenticated user via `ctx.auth`

## Development Commands

```bash
# Run all apps concurrently (from root)
npm run dev

# Run individually
cd apps/web && npm run dev           # Web at localhost:3000
cd apps/native && npx expo start     # Native with Expo
cd packages/backend && npx convex dev # Backend sync
```

## Adding New Convex Functions

1. Create/edit files in `packages/backend/convex/`
2. Run `npx convex dev` to sync and generate types
3. Import and use in web/native apps via `api.filename.functionName`

## Offline Sync Architecture (Native App)

The native app uses an offline-first architecture with SQLite (Drizzle ORM) as the local database.

### Key Concepts

**clientId** - A client-generated UUID that:
1. **Enables offline creates** - When offline, the app can't get a server `_id` from Convex. The `clientId` provides a stable identifier before syncing.
2. **Links local ↔ server records** - SQLite uses `clientId` as primary key; Convex stores both `_id` and `clientId`. During sync, records match by `clientId`.
3. **Prevents duplicates** - If a create operation retries, the server uses `clientId` to upsert instead of creating duplicates.

```
Mobile (offline):  clientId: "abc-123" → SQLite
                            ↓ sync
Server:            clientId: "abc-123", _id: "convex_xyz" → Convex
```

### Data Flow

| Mode | Write Flow |
|------|------------|
| Online | UI → Convex (direct) → sync back to SQLite |
| Offline | UI → SQLite → SyncQueue → push on reconnect |

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Mobile = create/update only | No delete on mobile; simplifies sync |
| Mobile-always-wins | Field data is authoritative on conflict |
| SQLite for reads | Seamless offline, no loading states |
| Initial sync required | Ensures offline capability from start |

### Adding New Synced Tables

1. Add to `apps/native/src/db/schema.ts` with: `clientId`, `serverId`, `userId`, `createdAt`, `updatedAt`, `syncStatus`
2. Run `npx drizzle-kit generate`
3. Add to Convex schema with indexes: `by_client_id`, `by_user`, `by_user_and_updated`
4. Create sync functions in `packages/backend/convex/sync.ts`
5. Create hook using the pattern in `apps/native/src/hooks/useTaskInstances.ts`

## Native App Conventions

### IMPORTANT: Custom Text Component
**NEVER use `Text` from `react-native` directly.** Always use the custom `Text` component from `src/components/Text.tsx`.

This is required because React Native has a [known Android bug](https://github.com/facebook/react-native/issues/53286) that cuts off the last characters of text. Our custom component automatically applies the fix (`textBreakStrategy="simple"` + trailing spaces) on Android while keeping iOS unchanged.

```typescript
// ❌ WRONG - Do not do this
import { Text } from "react-native";

// ✅ CORRECT - Always do this
import { Text } from "../components/Text";
// or
import { Text } from "../../components/Text";
```

### Hook Pattern
All data hooks follow this structure:
```typescript
export function useEntity(userId: string) {
  const { db } = useDatabase();
  const isOnline = useNetworkStatus();
  const convex = useConvex();

  const entities = useLiveQuery(
    db.select().from(entityTable).where(eq(entityTable.userId, userId))
  );

  const createEntity = async (data: CreateData) => {
    const clientId = uuid.v4();
    const now = new Date();

    await db.insert(entityTable).values({
      clientId,
      ...data,
      syncStatus: "pending",
    });

    if (isOnline) {
      try {
        const serverId = await convex.mutation(api.entities.create, { clientId, ...data });
        await db.update(entityTable).set({ serverId, syncStatus: "synced" }).where(eq(entityTable.clientId, clientId));
      } catch {
        await SyncQueue.add({ tableName: "entities", operation: "create", recordClientId: clientId, payload: data });
      }
    } else {
      await SyncQueue.add({ tableName: "entities", operation: "create", recordClientId: clientId, payload: data });
    }
  };

  return { entities, createEntity };
}
```

### Sync Service Integration
- SyncService is a singleton initialized in `SyncProvider`
- Subscribe to status changes via `SyncService.subscribe()`
- Trigger manual sync via `SyncService.sync()`
- Periodic sync runs every 30 seconds when online

### Required Fields for Synced Tables

| Field | SQLite Type | Purpose |
|-------|-------------|---------|
| `clientId` | TEXT PRIMARY KEY | Offline identity, links to server |
| `serverId` | TEXT (nullable) | Convex `_id` after first sync |
| `userId` | TEXT | Owner (from Clerk) |
| `createdAt` | TIMESTAMP | Creation time |
| `updatedAt` | TIMESTAMP | Last modification time |
| `syncStatus` | TEXT enum | "pending" or "synced" |

### Convex Sync Function Pattern
```typescript
export const upsertEntity = mutation({
  args: { clientId: v.string(), /* other fields */ },
  returns: v.id("entities"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("entities")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("entities", { ...args, createdAt: Date.now(), updatedAt: Date.now() });
  },
});
```

## Web App Conventions

### Component Structure
- Client components: Add `"use client"` directive at top
- Page components: Export default function with page name
- Use Clerk's `useUser()` for authenticated user data

### Convex Data Pattern (Web)
```typescript
"use client";
import { api } from "@packages/backend/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

export function EntityList({ userId }: { userId: string }) {
  const entities = useQuery(api.entities.get, { userId });
  const createEntity = useMutation(api.entities.create);

  if (!entities) return <Loading />;

  return (/* render entities */);
}
```

### Styling
- Use Tailwind CSS utility classes
- No separate CSS files needed
- Responsive with Tailwind breakpoints (sm, md, lg, xl)

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| SQLite as UI source | Seamless offline, no loading states on mobile |
| clientId pattern | Enables offline creates before server assignment |
| Mobile-always-wins | Simple conflict resolution, field workers are source of truth |
| No delete on mobile | Prevents accidental data loss, simplifies sync |
| Periodic sync (30s) | Balance between real-time and battery life |
| Separate sync functions | Decouples mobile sync from web CRUD operations |

## Date Handling (UTC Midnight Pattern)

All calendar dates (work orders, work order days, etc.) use **UTC midnight normalization** to ensure consistent display across timezones.

### Why UTC Midnight?
- User enters "2025-01-28" → Stored as `2025-01-28T00:00:00.000Z` (UTC midnight)
- Displayed as "January 28" regardless of viewer's timezone
- Prevents off-by-one day errors when users are in different timezones

### Date Utility Locations
| Package | File | Purpose |
|---------|------|---------|
| Backend | `packages/backend/convex/shared/dateUtils.ts` | Server-side UTC utilities |
| Web | `apps/web/src/utils/dateUtils.ts` | Web UTC utilities |
| Native | `apps/native/src/utils/dateUtils.ts` | Mobile UTC utilities |

### Key Functions
```typescript
import { UTCDate } from "@date-fns/utc";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

dateStringToUTCMidnight("2025-01-28")  // → UTC timestamp for midnight
utcMidnightToDateString(timestamp)     // → "2025-01-28"
normalizeToUTCMidnight(timestamp)      // → Normalize any timestamp to UTC midnight
addDaysUTC(timestamp, days)            // → Add days without timezone drift
formatUTCDate(timestamp, "EEE, d MMM") // → "lun, 28 ene" (Spanish locale)
```

### Usage Patterns

**Backend (Convex mutations):**
```typescript
import { normalizeToUTCMidnight, addDaysUTC, daysBetween } from "../shared/dateUtils";

const startDay = normalizeToUTCMidnight(args.startDate);
const endDay = normalizeToUTCMidnight(args.endDate);
const totalDays = daysBetween(startDay, endDay);

for (let i = 0; i < totalDays; i++) {
  const dayDate = addDaysUTC(startDay, i);
  await ctx.db.insert("workOrderDays", { dayDate, ... });
}
```

**Web (date inputs):**
```typescript
import { dateStringToUTCMidnight, utcMidnightToDateString, formatUTCDate } from "../../utils/dateUtils";

const startDateStr = utcMidnightToDateString(startDate);
<input type="date" value={startDateStr} />

await createWorkOrder({
  startDate: dateStringToUTCMidnight(startDateStr),
  endDate: dateStringToUTCMidnight(endDate),
});

{formatUTCDate(day.dayDate, "EEE, d MMM")}
```

**Native (date display):**
```typescript
import { formatUTCDateKey, formatUTCFullDate } from "../utils/dateUtils";

const dateKey = formatUTCDateKey(assignment.dayDate);
const displayDate = formatUTCFullDate(timestamp);
```

### IMPORTANT Rules
1. **NEVER use `new Date(dateString).getTime()`** for calendar dates - it interprets in local timezone
2. **ALWAYS use `dateStringToUTCMidnight()`** when converting user input to timestamps
3. **ALWAYS use `UTCDate` from `@date-fns/utc`** when formatting timestamps for display
4. **Use Spanish locale (`es`)** for all date formatting in this project
5. Store dates as `v.number()` (milliseconds) in Convex schema

---

# Convex guidelines
## Function guidelines
### New function syntax
- ALWAYS use the new function syntax for Convex functions. For example:
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
export const f = query({
    args: {},
    returns: v.null(),
    handler: async (ctx, args) => {
    // Function body
    },
});
```

### Http endpoint syntax
- HTTP endpoints are defined in `convex/http.ts` and require an `httpAction` decorator. For example:
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
const http = httpRouter();
http.route({
    path: "/echo",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
    const body = await req.bytes();
    return new Response(body, { status: 200 });
    }),
});
```
- HTTP endpoints are always registered at the exact path you specify in the `path` field. For example, if you specify `/api/someRoute`, the endpoint will be registered at `/api/someRoute`.

### Validators
- Below is an example of an array validator:
```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
args: {
    simpleArray: v.array(v.union(v.string(), v.number())),
},
handler: async (ctx, args) => {
    //...
},
});
```
- Below is an example of a schema with validators that codify a discriminated union type:
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    results: defineTable(
        v.union(
            v.object({
                kind: v.literal("error"),
                errorMessage: v.string(),
            }),
            v.object({
                kind: v.literal("success"),
                value: v.number(),
            }),
        ),
    )
});
```
- Always use the `v.null()` validator when returning a null value. Below is an example query that returns a null value:
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const exampleQuery = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
      console.log("This query returns a null value");
      return null;
  },
});
```
- Here are the valid Convex types along with their respective validators:
Convex Type  | TS/JS type  |  Example Usage         | Validator for argument validation and schemas  | Notes                                                                                                                                                                                                 |
| ----------- | ------------| -----------------------| -----------------------------------------------| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Id          | string      | `doc._id`              | `v.id(tableName)`                              |                                                                                                                                                                                                       |
| Null        | null        | `null`                 | `v.null()`                                     | JavaScript's `undefined` is not a valid Convex value. Functions the return `undefined` or do not return will return `null` when called from a client. Use `null` instead.                             |
| Int64       | bigint      | `3n`                   | `v.int64()`                                    | Int64s only support BigInts between -2^63 and 2^63-1. Convex supports `bigint`s in most modern browsers.                                                                                              |
| Float64     | number      | `3.1`                  | `v.number()`                                   | Convex supports all IEEE-754 double-precision floating point numbers (such as NaNs). Inf and NaN are JSON serialized as strings.                                                                      |
| Boolean     | boolean     | `true`                 | `v.boolean()`                                  |
| String      | string      | `"abc"`                | `v.string()`                                   | Strings are stored as UTF-8 and must be valid Unicode sequences. Strings must be smaller than the 1MB total size limit when encoded as UTF-8.                                                         |
| Bytes       | ArrayBuffer | `new ArrayBuffer(8)`   | `v.bytes()`                                    | Convex supports first class bytestrings, passed in as `ArrayBuffer`s. Bytestrings must be smaller than the 1MB total size limit for Convex types.                                                     |
| Array       | Array       | `[1, 3.2, "abc"]`      | `v.array(values)`                              | Arrays can have at most 8192 values.                                                                                                                                                                  |
| Object      | Object      | `{a: "abc"}`           | `v.object({property: value})`                  | Convex only supports "plain old JavaScript objects" (objects that do not have a custom prototype). Objects can have at most 1024 entries. Field names must be nonempty and not start with "$" or "_". |
| Record      | Record      | `{"a": "1", "b": "2"}` | `v.record(keys, values)`                       | Records are objects at runtime, but can have dynamic keys. Keys must be only ASCII characters, nonempty, and not start with "$" or "_".                                                               |

### Function registration
- Use `internalQuery`, `internalMutation`, and `internalAction` to register internal functions. These functions are private and aren't part of an app's API. They can only be called by other Convex functions. These functions are always imported from `./_generated/server`.
- Use `query`, `mutation`, and `action` to register public functions. These functions are part of the public API and are exposed to the public Internet. Do NOT use `query`, `mutation`, or `action` to register sensitive internal functions that should be kept private.
- You CANNOT register a function through the `api` or `internal` objects.
- ALWAYS include argument and return validators for all Convex functions. This includes all of `query`, `internalQuery`, `mutation`, `internalMutation`, `action`, and `internalAction`. If a function doesn't return anything, include `returns: v.null()` as its output validator.
- If the JavaScript implementation of a Convex function doesn't have a return value, it implicitly returns `null`.

### Function calling
- Use `ctx.runQuery` to call a query from a query, mutation, or action.
- Use `ctx.runMutation` to call a mutation from a mutation or action.
- Use `ctx.runAction` to call an action from an action.
- ONLY call an action from another action if you need to cross runtimes (e.g. from V8 to Node). Otherwise, pull out the shared code into a helper async function and call that directly instead.
- Try to use as few calls from actions to queries and mutations as possible. Queries and mutations are transactions, so splitting logic up into multiple calls introduces the risk of race conditions.
- All of these calls take in a `FunctionReference`. Do NOT try to pass the callee function directly into one of these calls.
- When using `ctx.runQuery`, `ctx.runMutation`, or `ctx.runAction` to call a function in the same file, specify a type annotation on the return value to work around TypeScript circularity limitations. For example,
```
export const f = query({
  args: { name: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    return "Hello " + args.name;
  },
});

export const g = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const result: string = await ctx.runQuery(api.example.f, { name: "Bob" });
    return null;
  },
});
```

### Function references
- Function references are pointers to registered Convex functions.
- Use the `api` object defined by the framework in `convex/_generated/api.ts` to call public functions registered with `query`, `mutation`, or `action`.
- Use the `internal` object defined by the framework in `convex/_generated/api.ts` to call internal (or private) functions registered with `internalQuery`, `internalMutation`, or `internalAction`.
- Convex uses file-based routing, so a public function defined in `convex/example.ts` named `f` has a function reference of `api.example.f`.
- A private function defined in `convex/example.ts` named `g` has a function reference of `internal.example.g`.
- Functions can also registered within directories nested within the `convex/` folder. For example, a public function `h` defined in `convex/messages/access.ts` has a function reference of `api.messages.access.h`.

### Api design
- Convex uses file-based routing, so thoughtfully organize files with public query, mutation, or action functions within the `convex/` directory.
- Use `query`, `mutation`, and `action` to define public functions.
- Use `internalQuery`, `internalMutation`, and `internalAction` to define private, internal functions.

### Pagination
- Paginated queries are queries that return a list of results in incremental pages.
- You can define pagination using the following syntax:

```ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
export const listWithExtraArg = query({
    args: { paginationOpts: paginationOptsValidator, author: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
        .query("messages")
        .filter((q) => q.eq(q.field("author"), args.author))
        .order("desc")
        .paginate(args.paginationOpts);
    },
});
```
Note: `paginationOpts` is an object with the following properties:
- `numItems`: the maximum number of documents to return (the validator is `v.number()`)
- `cursor`: the cursor to use to fetch the next page of documents (the validator is `v.union(v.string(), v.null())`)
- A query that ends in `.paginate()` returns an object that has the following properties:
                            - page (contains an array of documents that you fetches)
                            - isDone (a boolean that represents whether or not this is the last page of documents)
                            - continueCursor (a string that represents the cursor to use to fetch the next page of documents)


## Validator guidelines
- `v.bigint()` is deprecated for representing signed 64-bit integers. Use `v.int64()` instead.
- Use `v.record()` for defining a record type. `v.map()` and `v.set()` are not supported.

## Schema guidelines
- Always define your schema in `convex/schema.ts`.
- Always import the schema definition functions from `convex/server`.
- System fields are automatically added to all documents and are prefixed with an underscore. The two system fields that are automatically added to all documents are `_creationTime` which has the validator `v.number()` and `_id` which has the validator `v.id(tableName)`.
- Always include all index fields in the index name. For example, if an index is defined as `["field1", "field2"]`, the index name should be "by_field1_and_field2".
- Index fields must be queried in the same order they are defined. If you want to be able to query by "field1" then "field2" and by "field2" then "field1", you must create separate indexes.

## Typescript guidelines
- You can use the helper typescript type `Id` imported from './_generated/dataModel' to get the type of the id for a given table. For example if there is a table called 'users' you can use `Id<'users'>` to get the type of the id for that table.
- If you need to define a `Record` make sure that you correctly provide the type of the key and value in the type. For example a validator `v.record(v.id('users'), v.string())` would have the type `Record<Id<'users'>, string>`. Below is an example of using `Record` with an `Id` type in a query:
```ts
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const exampleQuery = query({
    args: { userIds: v.array(v.id("users")) },
    returns: v.record(v.id("users"), v.string()),
    handler: async (ctx, args) => {
        const idToUsername: Record<Id<"users">, string> = {};
        for (const userId of args.userIds) {
            const user = await ctx.db.get("users", userId);
            if (user) {
                idToUsername[user._id] = user.username;
            }
        }

        return idToUsername;
    },
});
```
- Be strict with types, particularly around id's of documents. For example, if a function takes in an id for a document in the 'users' table, take in `Id<'users'>` rather than `string`.
- Always use `as const` for string literals in discriminated union types.
- When using the `Array` type, make sure to always define your arrays as `const array: Array<T> = [...];`
- When using the `Record` type, make sure to always define your records as `const record: Record<KeyType, ValueType> = {...};`
- Always add `@types/node` to your `package.json` when using any Node.js built-in modules.

## Full text search guidelines
- A query for "10 messages in channel '#general' that best match the query 'hello hi' in their body" would look like:

const messages = await ctx.db
  .query("messages")
  .withSearchIndex("search_body", (q) =>
    q.search("body", "hello hi").eq("channel", "#general"),
  )
  .take(10);

## Query guidelines
- Do NOT use `filter` in queries. Instead, define an index in the schema and use `withIndex` instead.
- Convex queries do NOT support `.delete()`. Instead, `.collect()` the results, iterate over them, and call `ctx.db.delete(row._id)` on each result.
- Use `.unique()` to get a single document from a query. This method will throw an error if there are multiple documents that match the query.
- When using async iteration, don't use `.collect()` or `.take(n)` on the result of a query. Instead, use the `for await (const row of query)` syntax.
### Ordering
- By default Convex always returns documents in ascending `_creationTime` order.
- You can use `.order('asc')` or `.order('desc')` to pick whether a query is in ascending or descending order. If the order isn't specified, it defaults to ascending.
- Document queries that use indexes will be ordered based on the columns in the index and can avoid slow table scans.


## Mutation guidelines
- Use `ctx.db.replace` to fully replace an existing document. This method will throw an error if the document does not exist. Syntax: `await ctx.db.replace('tasks', taskId, { name: 'Buy milk', completed: false })`
- Use `ctx.db.patch` to shallow merge updates into an existing document. This method will throw an error if the document does not exist. Syntax: `await ctx.db.patch('tasks', taskId, { completed: true })`

## Action guidelines
- Always add `"use node";` to the top of files containing actions that use Node.js built-in modules.
- Never use `ctx.db` inside of an action. Actions don't have access to the database.
- Below is an example of the syntax for an action:
```ts
import { action } from "./_generated/server";

export const exampleAction = action({
    args: {},
    returns: v.null(),
    handler: async (ctx, args) => {
        console.log("This action does not return anything");
        return null;
    },
});
```

## Scheduling guidelines
### Cron guidelines
- Only use the `crons.interval` or `crons.cron` methods to schedule cron jobs. Do NOT use the `crons.hourly`, `crons.daily`, or `crons.weekly` helpers.
- Both cron methods take in a FunctionReference. Do NOT try to pass the function directly into one of these methods.
- Define crons by declaring the top-level `crons` object, calling some methods on it, and then exporting it as default. For example,
```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const empty = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("empty");
  },
});

const crons = cronJobs();

// Run `internal.crons.empty` every two hours.
crons.interval("delete inactive users", { hours: 2 }, internal.crons.empty, {});

export default crons;
```
- You can register Convex functions within `crons.ts` just like any other file.
- If a cron calls an internal function, always import the `internal` object from '_generated/api', even if the internal function is registered in the same file.


## File storage guidelines
- Convex includes file storage for large files like images, videos, and PDFs.
- The `ctx.storage.getUrl()` method returns a signed URL for a given file. It returns `null` if the file doesn't exist.
- Do NOT use the deprecated `ctx.storage.getMetadata` call for loading a file's metadata.

                    Instead, query the `_storage` system table. For example, you can use `ctx.db.system.get` to get an `Id<"_storage">`.
```
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type FileMetadata = {
    _id: Id<"_storage">;
    _creationTime: number;
    contentType?: string;
    sha256: string;
    size: number;
}

export const exampleQuery = query({
    args: { fileId: v.id("_storage") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const metadata: FileMetadata | null = await ctx.db.system.get("_storage", args.fileId);
        console.log(metadata);
        return null;
    },
});
```
- Convex storage stores items as `Blob` objects. You must convert all items to/from a `Blob` when using Convex storage.


# Examples:
## Example: chat-app

### Task
```
Create a real-time chat application backend with AI responses. The app should:
- Allow creating users with names
- Support multiple chat channels
- Enable users to send messages to channels
- Automatically generate AI responses to user messages
- Show recent message history

The backend should provide APIs for:
1. User management (creation)
2. Channel management (creation)
3. Message operations (sending, listing)
4. AI response generation using OpenAI's GPT-4

Messages should be stored with their channel, author, and content. The system should maintain message order
and limit history display to the 10 most recent messages per channel.

```

### Analysis
1. Task Requirements Summary:
- Build a real-time chat backend with AI integration
- Support user creation
- Enable channel-based conversations
- Store and retrieve messages with proper ordering
- Generate AI responses automatically

2. Main Components Needed:
- Database tables: users, channels, messages
- Public APIs for user/channel management
- Message handling functions
- Internal AI response generation system
- Context loading for AI responses

3. Public API and Internal Functions Design:
Public Mutations:
- createUser:
  - file path: convex/index.ts
  - arguments: {name: v.string()}
  - returns: v.object({userId: v.id("users")})
  - purpose: Create a new user with a given name
- createChannel:
  - file path: convex/index.ts
  - arguments: {name: v.string()}
  - returns: v.object({channelId: v.id("channels")})
  - purpose: Create a new channel with a given name
- sendMessage:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels"), authorId: v.id("users"), content: v.string()}
  - returns: v.null()
  - purpose: Send a message to a channel and schedule a response from the AI

Public Queries:
- listMessages:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels")}
  - returns: v.array(v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
    }))
  - purpose: List the 10 most recent messages from a channel in descending creation order

Internal Functions:
- generateResponse:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels")}
  - returns: v.null()
  - purpose: Generate a response from the AI for a given channel
- loadContext:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels")}
  - returns: v.array(v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
  }))
- writeAgentResponse:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels"), content: v.string()}
  - returns: v.null()
  - purpose: Write an AI response to a given channel

4. Schema Design:
- users
  - validator: { name: v.string() }
  - indexes: <none>
- channels
  - validator: { name: v.string() }
  - indexes: <none>
- messages
  - validator: { channelId: v.id("channels"), authorId: v.optional(v.id("users")), content: v.string() }
  - indexes
    - by_channel: ["channelId"]

5. Background Processing:
- AI response generation runs asynchronously after each user message
- Uses OpenAI's GPT-4 to generate contextual responses
- Maintains conversation context using recent message history


### Implementation

#### package.json
```typescript
{
  "name": "chat-app",
  "description": "This example shows how to build a chat app without authentication.",
  "version": "1.0.0",
  "dependencies": {
    "convex": "^1.31.2",
    "openai": "^4.79.0"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

#### tsconfig.json
```typescript
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "exclude": ["convex"],
  "include": ["**/src/**/*.tsx", "**/src/**/*.ts", "vite.config.ts"]
}
```

#### convex/index.ts
```typescript
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";

/**
 * Create a user with a given name.
 */
export const createUser = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", { name: args.name });
  },
});

/**
 * Create a channel with a given name.
 */
export const createChannel = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("channels"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("channels", { name: args.name });
  },
});

/**
 * List the 10 most recent messages from a channel in descending creation order.
 */
export const listMessages = query({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      channelId: v.id("channels"),
      authorId: v.optional(v.id("users")),
      content: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(10);
    return messages;
  },
});

/**
 * Send a message to a channel and schedule a response from the AI.
 */
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    authorId: v.id("users"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const channel = await ctx.db.get("channels", args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }
    const user = await ctx.db.get("users", args.authorId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: args.authorId,
      content: args.content,
    });
    await ctx.scheduler.runAfter(0, internal.index.generateResponse, {
      channelId: args.channelId,
    });
    return null;
  },
});

const openai = new OpenAI();

export const generateResponse = internalAction({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.index.loadContext, {
      channelId: args.channelId,
    });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: context,
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }
    await ctx.runMutation(internal.index.writeAgentResponse, {
      channelId: args.channelId,
      content,
    });
    return null;
  },
});

export const loadContext = internalQuery({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.array(
    v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const channel = await ctx.db.get("channels", args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(10);

    const result = [];
    for (const message of messages) {
      if (message.authorId) {
        const user = await ctx.db.get("users", message.authorId);
        if (!user) {
          throw new Error("User not found");
        }
        result.push({
          role: "user" as const,
          content: `${user.name}: ${message.content}`,
        });
      } else {
        result.push({ role: "assistant" as const, content: message.content });
      }
    }
    return result;
  },
});

export const writeAgentResponse = internalMutation({
  args: {
    channelId: v.id("channels"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      channelId: args.channelId,
      content: args.content,
    });
    return null;
  },
});
```

#### convex/schema.ts
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  channels: defineTable({
    name: v.string(),
  }),

  users: defineTable({
    name: v.string(),
  }),

  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
  }).index("by_channel", ["channelId"]),
});
```

#### src/App.tsx
```typescript
export default function App() {
  return <div>Hello World</div>;
}
```


