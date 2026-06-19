export interface NotificationPayload {
  to: string
  type: 'whatsapp' | 'sms' | 'email'
  message: string
  metadata?: Record<string, unknown>
}

export class MockNotificationAdapter {
  private log: Array<{ at: Date; payload: NotificationPayload }> = []

  async send(payload: NotificationPayload): Promise<{ ok: boolean; messageId: string }> {
    this.log.push({ at: new Date(), payload })
    console.log(`[MockNotification] ${payload.type} → ${payload.to}: ${payload.message.slice(0, 80)}`)
    return { ok: true, messageId: `mock-${Date.now()}` }
  }

  getSentLog() {
    return this.log
  }
}

export const notificationAdapter = new MockNotificationAdapter()
