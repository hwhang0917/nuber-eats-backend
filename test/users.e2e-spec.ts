import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { getConnection, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Verification } from 'src/users/entities/verification.entity';

const testUser = {
  email: 'test@test.com',
  password: 'test',
};

jest.mock('got', () => {
  return {
    post: jest.fn(),
  };
});

const GRAPHQL_ENDPOINT = '/graphql';

describe('UserModule (E2E)', () => {
  let app: INestApplication;
  let graphQLQuery: (query: string, jwtToken?: string) => request.Test;
  let usersRepository: Repository<User>;
  let verificationsRepository: Repository<Verification>;
  let jwtToken: string;
  const invalidValue = 'invalid-value';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    verificationsRepository = module.get<Repository<Verification>>(
      getRepositoryToken(Verification),
    );
    graphQLQuery = (query: string, jwtToken?: string) =>
      request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken ? jwtToken : '')
        .send({ query });
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    await app.close();
  });

  describe('createAccount', () => {
    it('should create an account', () => {
      return graphQLQuery(`
          mutation {
            createAccount(input:{
              email:"${testUser.email}",
              password:"${testUser.password}",
              role:Admin
            }) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(true);
          expect(res.body.data.createAccount.error).toBe(null);
        });
    });

    it('should fail if account already exists', () => {
      return graphQLQuery(`
          mutation {
            createAccount(input:{
              email:"${testUser.email}",
              password:"${testUser.password}",
              role:Admin
            }) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(false);
          expect(res.body.data.createAccount.error).toBe(
            'There is a user with that email already',
          );
        });
    });
  });

  describe('login', () => {
    it('should login with correct credentials', () => {
      return graphQLQuery(`
        mutation {
          login(input:{
            email:"${testUser.email}",
            password:"${testUser.password}"
          }) {
            ok
            error
            token
          }
        }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(true);
          expect(login.error).toBe(null);
          expect(login.token).toEqual(expect.any(String));
          jwtToken = login.token;
        });
    });

    it('should deny login with wrong password', () => {
      return graphQLQuery(`
        mutation {
          login(input:{
            email:"${testUser.email}",
            password:"wrong-password"
          }) {
            ok
            error
            token
          }
        }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(false);
          expect(login.error).toBe('Wrong password');
          expect(login.token).toBe(null);
        });
    });

    it('should deny login with email that does not exists', () => {
      return graphQLQuery(`
        mutation {
          login(input:{
            email:"unknown@unknown.com",
            password:"wrong-password"
          }) {
            ok
            error
            token
          }
        }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(false);
          expect(login.error).toBe('User not found');
          expect(login.token).toBe(null);
        });
    });
  });

  describe('userProfile', () => {
    let userId: number;

    beforeAll(async () => {
      const user = await usersRepository.findOne({ email: testUser.email });
      userId = user.id;
    });

    it('should get the user profile of given userId', () => {
      return graphQLQuery(
        `
          {
            userProfile(userId: ${userId}) {
              ok
              error
              user {
                email
              }
            }
          }
        `,
        jwtToken,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: {
                  ok,
                  error,
                  user: { email },
                },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(email).toEqual(testUser.email);
        });
    });

    it('should fail if token is invalid', () => {
      return graphQLQuery(
        `
          {
            userProfile(userId: ${userId}) {
              ok
              error
              user {
                email
              }
            }
          }
        `,
        invalidValue,
      ).expect((res) => {
        expect(res.body.errors).toEqual(expect.any(Object));
        expect(res.body.data).toBe(null);
      });
    });

    it("should fail if account doesn't exist", () => {
      return graphQLQuery(
        `
          {
            userProfile(userId: 9999) {
              ok
              error
              user {
                email
              }
            }
          }
        `,
        jwtToken,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: { ok, error, user },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('User not found');
          expect(user).toBe(null);
        });
    });
  });

  describe('me', () => {
    let userId: number;

    beforeAll(async () => {
      const user = await usersRepository.findOne({ email: testUser.email });
      userId = user.id;
    });

    it('should deny logged out user', () => {
      return graphQLQuery(
        `
          {
            me {
              id
              email
            }
          }
        `,
        invalidValue,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: { data },
          } = res;
          expect(res.body.errors).toEqual(expect.any(Object));
          expect(data).toBe(null);
        });
    });

    it('should find my profile', () => {
      return graphQLQuery(
        `
          {
            me {
              id
              email
            }
          }
        `,
        jwtToken,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { id, email },
              },
            },
          } = res;
          expect(id).toBe(userId);
          expect(email).toBe(testUser.email);
        });
    });
  });

  describe('verifyEmail', () => {
    let verificationCode: string;

    beforeAll(async () => {
      const [verification] = await verificationsRepository.find();
      verificationCode = verification.code;
    });

    it('should verify email', () => {
      return graphQLQuery(
        `
          mutation {
            verifyEmail(input:{
              code: "${verificationCode}"
            }) {
              ok
              error
            }
          }
        `,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);

          const [user] = await usersRepository.find();
          expect(user.verified).toBe(true);
        });
    });

    it('should fail if verification code is invalid', () => {
      return graphQLQuery(
        `
          mutation {
            verifyEmail(input:{
              code: "${invalidValue}"
            }) {
              ok
              error
            }
          }
        `,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('Verification not found');
        });
    });
  });

  describe('editProfile', () => {
    const NEW_EMAIL = 'new@new.com';
    const NEW_PASSWORD = 'newpassword';

    it('should change email', () => {
      return graphQLQuery(
        `
          mutation {
            editProfile(input:{
              email: "${NEW_EMAIL}",
            }) {
              ok
              error
            }
          }
        `,
        jwtToken,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editProfile: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should have new email', () => {
      return graphQLQuery(
        `
          {
            me {
              email
            }
          }
        `,
        jwtToken,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toBe(NEW_EMAIL);
        });
    });

    it('should have switched verified to false', () => {
      return graphQLQuery(
        `
          {
            me {
              verified
            }
          }
        `,
        jwtToken,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { verified },
              },
            },
          } = res;
          expect(verified).toBe(false);
        });
    });

    it('should change password', () => {
      return graphQLQuery(
        `
          mutation {
            editProfile(input:{
              password: "${NEW_PASSWORD}",
            }) {
              ok
              error
            }
          }
        `,
        jwtToken,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editProfile: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should be able to log in with new email & new password', () => {
      return graphQLQuery(`
        mutation {
          login(input:{
            email:"${NEW_EMAIL}",
            password:"${NEW_PASSWORD}"
          }) {
            ok
            error
            token
          }
        }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(true);
          expect(login.error).toBe(null);
          expect(login.token).toEqual(expect.any(String));
          jwtToken = login.token;
        });
    });
  });

  describe('deleteMyAccount', () => {
    it('should deny logged out user', () => {
      return graphQLQuery(
        `
          mutation {
            deleteMyAccount {
              ok
              error
            }
          }
        `,
        invalidValue,
      )
        .expect(200)
        .expect((res) => {
          const {
            body: { data },
          } = res;
          expect(res.body.errors).toEqual(expect.any(Object));
          expect(data).toBe(null);
        });
    });

    it('should delete my account', () => {
      return graphQLQuery(
        `
          mutation {
            deleteMyAccount {
              ok
              error
            }
          }
        `,
        jwtToken,
      )
        .expect(200)
        .expect(async (res) => {
          const {
            body: {
              data: {
                deleteMyAccount: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);

          const users = await usersRepository.find();
          expect(users.length).toBe(0);
        });
    });
  });
});
