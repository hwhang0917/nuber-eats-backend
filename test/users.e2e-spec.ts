import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { getConnection } from 'typeorm';

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

describe('UserModule (e2e)', () => {
  let app: INestApplication;
  let graphQLQuery: (query: string) => request.Test;
  let jwtToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    graphQLQuery = (query: string) =>
      request(app.getHttpServer()).post(GRAPHQL_ENDPOINT).send({ query });
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
    it.todo('should get the user profile of given userId');

    it.todo("should fail if account doesn't exist");
  });

  it.todo('me');

  it.todo('verifyEmail');

  it.todo('editProfile');

  it.todo('deleteMyAccount');
});
