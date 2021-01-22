export interface MailModuleOptions {
  apiKey: string;
  domain: string;
  fromEmail: string;
}

export interface SendEmailConfig {
  subject: string;
  recipient: string;
  template: 'verify-email';
  emailVars: EmailVars[];
}

interface EmailVars {
  key: string;
  value: string;
}
