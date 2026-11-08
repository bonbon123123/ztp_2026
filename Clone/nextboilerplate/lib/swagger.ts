import { createSwaggerSpec } from "next-swagger-doc";

const Error = {
  type: "object",
  properties: {
    error: { type: "string" },
    details: { type: "array", items: { type: "string" } },
  },
};

const productSchemas = {
  Error,
  Product: {
    type: "object",
    properties: {
      id: { type: "integer", example: 1 },
      name: { type: "string", example: "Rogal" },
      price: { type: "number", example: 3.5 },
      quantity: { type: "integer", example: 20 },
      category_id: { type: "integer", example: 1 },
      category: { type: "string", example: "Pieczywo" },
    },
  },
  ProductInput: {
    type: "object",
    required: ["name", "price", "quantity", "category_id"],
    properties: {
      name: { type: "string", description: "3–20 liter/cyfr, unikalna, niezakazana", example: "Bulka" },
      price: { type: "number", description: "W zakresie cen kategorii", example: 1.5 },
      quantity: { type: "integer", minimum: 0, example: 10 },
      category_id: { type: "integer", example: 1 },
    },
  },
  ProductPatch: {
    type: "object",
    properties: {
      name: { type: "string" },
      price: { type: "number" },
      quantity: { type: "integer", minimum: 0 },
      category_id: { type: "integer" },
    },
    example: { quantity: 5 },
  },
  ProductHistory: {
    type: "object",
    properties: {
      id: { type: "integer" },
      action: { type: "string", enum: ["CREATE", "UPDATE", "DELETE"] },
      old_data: { type: "object", nullable: true },
      new_data: { type: "object", nullable: true },
      changed_at: { type: "string", format: "date-time" },
    },
  },
};

const notificationSchemas = {
  Error,
  NotificationStatus: { type: "string", enum: ["PENDING", "SENT", "FAILED", "CANCELLED"] },
  NotificationChannel: { type: "string", enum: ["EMAIL", "PUSH"] },
  NotificationCreate: {
    type: "object",
    required: ["content", "channel", "recipient", "scheduled_at", "timezone"],
    properties: {
      content: { type: "string", example: "Przypomnienie o zajęciach" },
      channel: { $ref: "#/components/schemas/NotificationChannel" },
      recipient: { type: "string", example: "student@example.com" },
      scheduled_at: {
        type: "string",
        description: "ISO 8601; bez offsetu = czas lokalny w strefie timezone",
        example: "2026-12-01T09:00:00",
      },
      timezone: { type: "string", description: "Nazwa strefy IANA", example: "Europe/Warsaw" },
      product_id: { type: "integer", nullable: true, description: "Opcjonalnie: produkt, którego dotyczy", example: 1 },
    },
  },
  Notification: {
    type: "object",
    properties: {
      id: { type: "integer", example: 1 },
      content: { type: "string" },
      channel: { $ref: "#/components/schemas/NotificationChannel" },
      recipient: { type: "string" },
      scheduled_at: { type: "string", format: "date-time", description: "UTC", example: "2026-12-01T08:00:00.000Z" },
      timezone: { type: "string", example: "Europe/Warsaw" },
      status: { $ref: "#/components/schemas/NotificationStatus" },
      product_id: { type: "integer", nullable: true },
      created_at: { type: "string", format: "date-time" },
    },
  },
};

export const productsSpec = () =>
  createSwaggerSpec({
    apiFolder: "app/api/v1/products",
    definition: {
      openapi: "3.0.0",
      info: { title: "Products API", version: "1.0" },
      tags: [{ name: "Products" }],
      components: { schemas: productSchemas },
    },
  });

export const notificationsSpec = () =>
  createSwaggerSpec({
    apiFolder: "app/api/v1/notifications",
    definition: {
      openapi: "3.0.0",
      info: { title: "Notifications API", version: "1.0" },
      tags: [{ name: "Notifications" }],
      components: { schemas: notificationSchemas },
    },
  });
