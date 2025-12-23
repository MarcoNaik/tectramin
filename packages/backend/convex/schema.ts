import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
    role: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_role", ["role"])
    .index("by_active", ["isActive"]),

  customers: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    rut: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  faenas: defineTable({
    customerId: v.id("customers"),
    name: v.string(),
    location: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_customer", ["customerId"]),

  services: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    defaultDays: v.number(),
    requiredPeople: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  taskTemplates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    isRepeatable: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  fieldTemplates: defineTable({
    taskTemplateId: v.id("taskTemplates"),
    label: v.string(),
    fieldType: v.string(),
    order: v.number(),
    isRequired: v.boolean(),
    defaultValue: v.optional(v.string()),
    placeholder: v.optional(v.string()),
    subheader: v.optional(v.string()),
    displayStyle: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_task_template", ["taskTemplateId"]),

  serviceTaskTemplates: defineTable({
    serviceId: v.id("services"),
    taskTemplateId: v.id("taskTemplates"),
    order: v.number(),
    isRequired: v.boolean(),
    dayNumber: v.optional(v.number()),
  })
    .index("by_service", ["serviceId"])
    .index("by_task_template", ["taskTemplateId"])
    .index("by_service_and_day", ["serviceId", "dayNumber"]),

  workOrders: defineTable({
    customerId: v.id("customers"),
    faenaId: v.id("faenas"),
    serviceId: v.optional(v.id("services")),
    name: v.string(),
    status: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer", ["customerId"])
    .index("by_faena", ["faenaId"])
    .index("by_status", ["status"])
    .index("by_date_range", ["startDate", "endDate"]),

  workOrderDays: defineTable({
    workOrderId: v.id("workOrders"),
    dayDate: v.number(),
    dayNumber: v.number(),
    status: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_work_order", ["workOrderId"])
    .index("by_date", ["dayDate"])
    .index("by_status", ["status"]),

  workOrderDayAssignments: defineTable({
    workOrderDayId: v.id("workOrderDays"),
    userId: v.id("users"),
    assignedAt: v.number(),
    assignedBy: v.optional(v.id("users")),
  })
    .index("by_work_order_day", ["workOrderDayId"])
    .index("by_user", ["userId"]),

  workOrderDayTaskTemplates: defineTable({
    workOrderDayId: v.id("workOrderDays"),
    taskTemplateId: v.id("taskTemplates"),
    order: v.number(),
    isRequired: v.boolean(),
  })
    .index("by_work_order_day", ["workOrderDayId"])
    .index("by_task_template", ["taskTemplateId"]),

  taskInstances: defineTable({
    clientId: v.string(),
    workOrderDayId: v.id("workOrderDays"),
    workOrderDayTaskTemplateId: v.id("workOrderDayTaskTemplates"),
    taskTemplateId: v.id("taskTemplates"),
    userId: v.string(),
    instanceLabel: v.optional(v.string()),
    status: v.string(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client_id", ["clientId"])
    .index("by_user", ["userId"])
    .index("by_user_and_updated", ["userId", "updatedAt"])
    .index("by_work_order_day", ["workOrderDayId"])
    .index("by_status", ["status"]),

  fieldResponses: defineTable({
    clientId: v.string(),
    taskInstanceId: v.id("taskInstances"),
    taskInstanceClientId: v.string(),
    fieldTemplateId: v.id("fieldTemplates"),
    value: v.optional(v.string()),
    userId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client_id", ["clientId"])
    .index("by_task_instance", ["taskInstanceId"])
    .index("by_user_and_updated", ["userId", "updatedAt"])
    .index("by_task_instance_client_id", ["taskInstanceClientId"]),

  attachments: defineTable({
    clientId: v.string(),
    fieldResponseId: v.optional(v.id("fieldResponses")),
    fieldResponseClientId: v.string(),
    storageId: v.optional(v.id("_storage")),
    fileName: v.string(),
    fileType: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    userId: v.string(),
    uploadStatus: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client_id", ["clientId"])
    .index("by_field_response_client_id", ["fieldResponseClientId"])
    .index("by_user_and_updated", ["userId", "updatedAt"]),
});
