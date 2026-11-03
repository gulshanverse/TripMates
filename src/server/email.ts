export type EmailMessage = { to: string; subject: string; text: string };
export interface EmailProvider { send(message: EmailMessage): Promise<void>; }

export function createEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider | null {
  const provider = env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (!provider || provider === 'disabled') return null;
  if (provider !== 'smtp') throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  if (!env.EMAIL_SMTP_HOST || !env.EMAIL_SMTP_USER || !env.EMAIL_SMTP_PASSWORD || !env.EMAIL_FROM) {
    throw new Error('EMAIL_SMTP_HOST, EMAIL_SMTP_USER, EMAIL_SMTP_PASSWORD, and EMAIL_FROM are required when email is enabled.');
  }
  throw new Error('SMTP provider adapter is not installed; keep EMAIL_PROVIDER=disabled until a verified provider is configured.');
}

export function emailWorkflowsEnabled(env: NodeJS.ProcessEnv = process.env) { return Boolean(env.EMAIL_PROVIDER && env.EMAIL_PROVIDER !== 'disabled'); }
