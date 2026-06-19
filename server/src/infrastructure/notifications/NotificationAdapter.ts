export interface NotificationPayload {
  templateKey: string;
  recipient: string;
  data: Record<string, unknown>;
}

export interface NotificationAdapter {
  send(payload: NotificationPayload, idempotencyKey: string): Promise<{ messageId: string }>;
}
