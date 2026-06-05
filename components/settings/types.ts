export interface ApiKeyRecord {
  id: string;
  name: string;
  maskedKey: string;
  rateLimitPerMin?: number;
  rateLimitPerDay?: number;
  expiresAt?: string | null;
  createdAt: string;
}

export interface WorkflowWebhookRecord {
  id: string;
  name: string;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
}
