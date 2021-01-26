/* eslint-disable @typescript-eslint/no-empty-function */
import { Test } from '@nestjs/testing';
import got from 'got';
import * as FormData from 'form-data';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { MailService } from './mail.service';

jest.mock('got');
jest.mock('form-data');

const TEST_DOMAIN = 'test-domain';

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            apiKey: 'test-apiKey',
            domain: TEST_DOMAIN,
            fromEmail: 'test-fromEmail',
          },
        },
      ],
    }).compile();
    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email', async () => {
      const ok = await service.sendEmail({
        subject: '',
        recipient: '',
        template: 'verify-email',
        emailVars: [
          {
            key: '',
            value: '',
          },
        ],
      });
      const formDataApy = jest.spyOn(FormData.prototype, 'append');

      expect(formDataApy).toHaveBeenCalled();
      expect(got.post).toHaveBeenCalled();
      expect(got.post).toHaveBeenCalledWith(
        `https://api.mailgun.net/v3/${TEST_DOMAIN}/messages`,
        expect.any(Object),
      );
      expect(ok).toEqual(true);
    });

    it('should fail on exception', async () => {
      jest.spyOn(got, 'post').mockImplementation(() => {
        throw new Error();
      });
      const ok = await service.sendEmail({
        subject: '',
        recipient: '',
        template: 'verify-email',
        emailVars: [
          {
            key: '',
            value: '',
          },
        ],
      });

      expect(ok).toEqual(false);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should call sendEmail', () => {
      const sendVerificationEmailArgs = {
        email: 'test@test.com',
        code: 'test-verification-code',
      };
      jest.spyOn(service, 'sendEmail').mockImplementation(async () => {
        return true;
      });

      service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );

      expect(service.sendEmail).toHaveBeenCalled();
      expect(service.sendEmail).toHaveBeenCalledWith({
        subject: 'Verify Your Email',
        template: 'verify-email',
        recipient: sendVerificationEmailArgs.email,
        emailVars: [
          { key: 'code', value: sendVerificationEmailArgs.code },
          { key: 'username', value: sendVerificationEmailArgs.email },
        ],
      });
    });
  });
});
