// Statusy cyklu życia powiadomienia
export const NotificationStatus = {
  PENDING: "PENDING", // oczekujące
  SENT: "SENT", // wysłane
  FAILED: "FAILED", // nieudane
  CANCELLED: "CANCELLED", // anulowane
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

// Kanały dostarczenia
export const NotificationChannel = {
  EMAIL: "EMAIL",
  PUSH: "PUSH",
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const isStatus = (v: unknown): v is NotificationStatus =>
  typeof v === "string" && Object.values(NotificationStatus).includes(v as NotificationStatus);

export const isChannel = (v: unknown): v is NotificationChannel =>
  typeof v === "string" && Object.values(NotificationChannel).includes(v as NotificationChannel);

export type Notification = {
  id: number;
  content: string;
  channel: NotificationChannel;
  recipient: string;
  scheduled_at: string; // ISO, UTC
  timezone: string;
  status: NotificationStatus;
  product_id: number | null;
  created_at: string;
  idempotency_key: string; // generowany przez serwer, nie przyjmowany z wejścia
};

export type NotificationInput = {
  content: string;
  channel: NotificationChannel;
  recipient: string;
  scheduled_at: Date; // znormalizowane do UTC
  timezone: string;
  product_id: number | null;
  idempotency_key: string;
};
