/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assignments from "../assignments.js";
import type * as customers from "../customers.js";
import type * as faenas from "../faenas.js";
import type * as fieldResponses from "../fieldResponses.js";
import type * as fieldTemplates from "../fieldTemplates.js";
import type * as services from "../services.js";
import type * as sync from "../sync.js";
import type * as taskInstances from "../taskInstances.js";
import type * as taskTemplates from "../taskTemplates.js";
import type * as users from "../users.js";
import type * as workOrderDays from "../workOrderDays.js";
import type * as workOrders from "../workOrders.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assignments: typeof assignments;
  customers: typeof customers;
  faenas: typeof faenas;
  fieldResponses: typeof fieldResponses;
  fieldTemplates: typeof fieldTemplates;
  services: typeof services;
  sync: typeof sync;
  taskInstances: typeof taskInstances;
  taskTemplates: typeof taskTemplates;
  users: typeof users;
  workOrderDays: typeof workOrderDays;
  workOrders: typeof workOrders;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
