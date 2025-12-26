/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_assignments from "../admin/assignments.js";
import type * as admin_customers from "../admin/customers.js";
import type * as admin_dashboardGrid from "../admin/dashboardGrid.js";
import type * as admin_faenas from "../admin/faenas.js";
import type * as admin_fieldConditions from "../admin/fieldConditions.js";
import type * as admin_fieldResponses from "../admin/fieldResponses.js";
import type * as admin_fieldTemplates from "../admin/fieldTemplates.js";
import type * as admin_services from "../admin/services.js";
import type * as admin_taskInstances from "../admin/taskInstances.js";
import type * as admin_taskTemplates from "../admin/taskTemplates.js";
import type * as admin_workOrderDays from "../admin/workOrderDays.js";
import type * as admin_workOrders from "../admin/workOrders.js";
import type * as mobile_sync from "../mobile/sync.js";
import type * as shared_attachments from "../shared/attachments.js";
import type * as shared_users from "../shared/users.js";
import type * as talana from "../talana.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/assignments": typeof admin_assignments;
  "admin/customers": typeof admin_customers;
  "admin/dashboardGrid": typeof admin_dashboardGrid;
  "admin/faenas": typeof admin_faenas;
  "admin/fieldConditions": typeof admin_fieldConditions;
  "admin/fieldResponses": typeof admin_fieldResponses;
  "admin/fieldTemplates": typeof admin_fieldTemplates;
  "admin/services": typeof admin_services;
  "admin/taskInstances": typeof admin_taskInstances;
  "admin/taskTemplates": typeof admin_taskTemplates;
  "admin/workOrderDays": typeof admin_workOrderDays;
  "admin/workOrders": typeof admin_workOrders;
  "mobile/sync": typeof mobile_sync;
  "shared/attachments": typeof shared_attachments;
  "shared/users": typeof shared_users;
  talana: typeof talana;
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
