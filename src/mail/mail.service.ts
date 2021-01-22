import got from 'got';
import * as FormData from 'form-data';
import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { MailModuleOptions, SendEmailConfig } from './mail.interface';

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {}

  private async sendEmail({
    subject,
    recipient,
    template,
    emailVars,
  }: SendEmailConfig) {
    const form = new FormData();
    form.append('from', `NuberEats <nuber-clone@${this.options.domain}>`);
    form.append('to', recipient);
    form.append('subject', subject);
    form.append('template', template);
    emailVars.forEach((eVar) => form.append(`v:${eVar.key}`, eVar.value));

    try {
      await got(`https://api.mailgun.net/v3/${this.options.domain}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `api:${this.options.apiKey}`,
          ).toString('base64')}`,
        },
        body: form,
      });
    } catch (error) {
      console.log(error);
    }
  }

  sendVerificationEmail(email: string, code: string) {
    this.sendEmail({
      subject: 'Verify Your Email',
      template: 'verify-email',
      recipient: email,
      emailVars: [
        { key: 'code', value: code },
        { key: 'username', value: email },
      ],
    });
  }
}
