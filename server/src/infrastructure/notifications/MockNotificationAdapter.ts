import { NotificationAdapter, NotificationPayload } from './NotificationAdapter';

export class MockNotificationAdapter implements NotificationAdapter {
  async send(
    payload: NotificationPayload,
    idempotencyKey: string
  ): Promise<{ messageId: string }> {
    const messageId = `mock-msg-${idempotencyKey}-${Date.now()}`;
    console.log(`[MockNotification] Sending "${payload.templateKey}" to ${payload.recipient}`, {
      data: payload.data,
      messageId,
    });
    return { messageId };
  }
}
