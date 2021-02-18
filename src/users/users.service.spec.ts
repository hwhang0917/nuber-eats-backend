import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from 'src/jwt/jwt.service';
import { MailService } from 'src/mail/mail.service';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { UserService } from './users.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn(() => 'signed token'),
  verify: jest.fn(),
});

const mockMailService = () => ({
  sendVerificationEmail: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UserService', () => {
  let service: UserService;
  let usersRepository: MockRepository<User>;
  let verificationsRepository: MockRepository<Verification>;
  let mailService: MailService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService(),
        },
        {
          provide: MailService,
          useValue: mockMailService(),
        },
      ],
    }).compile();
    service = module.get<UserService>(UserService);
    mailService = module.get<MailService>(MailService);
    jwtService = module.get<JwtService>(JwtService);
    usersRepository = module.get(getRepositoryToken(User));
    verificationsRepository = module.get(getRepositoryToken(Verification));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount [non-Admin account]', () => {
    const createAccountArgs = {
      email: 'test@test.com',
      password: 'test.password',
      role: UserRole.Client,
    };

    const publicUser = undefined;

    it('should fail if user exists', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
      });
      const result = await service.createAccount(publicUser, createAccountArgs);

      expect(result).toMatchObject({
        ok: false,
        error: 'There is a user with that email already',
      });
    });
    it('should create a new user', async () => {
      usersRepository.findOne.mockResolvedValue(undefined);
      usersRepository.create.mockReturnValue(createAccountArgs);
      usersRepository.save.mockResolvedValue(createAccountArgs);
      verificationsRepository.create.mockReturnValue({
        user: createAccountArgs,
      });
      verificationsRepository.save.mockResolvedValue({
        code: 'code',
      });

      const result = await service.createAccount(publicUser, createAccountArgs);

      expect(usersRepository.create).toHaveBeenCalled();
      expect(usersRepository.create).toHaveBeenCalledWith(createAccountArgs);

      expect(usersRepository.save).toHaveBeenCalled();
      expect(usersRepository.save).toHaveBeenCalledWith(createAccountArgs);

      expect(verificationsRepository.create).toHaveBeenCalled();
      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: createAccountArgs,
      });

      expect(verificationsRepository.save).toHaveBeenCalled();
      expect(verificationsRepository.save).toHaveBeenCalledWith({
        user: createAccountArgs,
      });

      expect(mailService.sendVerificationEmail).toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );
      expect(result).toEqual({ ok: true });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createAccount(publicUser, createAccountArgs);
      expect(result).toEqual({ ok: false, error: 'Could not create account' });
    });
  });

  describe('createAccount [Admin account]', () => {
    const mockUser: User = {
      id: 0,
      createdAt: null,
      updatedAt: null,
      email: 'test@test.com',
      password: 'test',
      verified: true,
      role: null,
      restaurants: [],
      orders: [],
      rides: [],
      hashPassword: jest.fn(),
      checkPassword: jest.fn(),
    };

    const createAdminAccountArgs = {
      email: 'admin@test.com',
      password: 'admin',
      role: UserRole.Admin,
    };

    const publicUser = undefined;
    const unauthorizedUser: User = {
      ...mockUser,
      hashPassword: jest.fn(),
      checkPassword: jest.fn(),
      role: UserRole.Client,
    };
    const authorizedUSer: User = {
      ...mockUser,
      hashPassword: jest.fn(),
      checkPassword: jest.fn(),
      role: UserRole.Admin,
    };

    it('should fail if user is not loggedIn', async () => {
      const result = await service.createAccount(
        publicUser,
        createAdminAccountArgs,
      );

      expect(result).toEqual({
        ok: false,
        error: 'Only Admin can create admin account',
      });
    });

    it('should fail if user is not admin', async () => {
      const result = await service.createAccount(
        unauthorizedUser,
        createAdminAccountArgs,
      );

      expect(result).toEqual({
        ok: false,
        error: 'Only Admin can create admin account',
      });
    });

    it('should create admin account', async () => {
      usersRepository.findOne.mockResolvedValue(undefined);
      usersRepository.create.mockReturnValue(createAdminAccountArgs);
      usersRepository.save.mockResolvedValue(createAdminAccountArgs);
      verificationsRepository.create.mockReturnValue({
        user: createAdminAccountArgs,
      });
      verificationsRepository.save.mockResolvedValue({
        code: 'code',
      });

      const result = await service.createAccount(
        authorizedUSer,
        createAdminAccountArgs,
      );

      expect(usersRepository.create).toHaveBeenCalled();
      expect(usersRepository.create).toHaveBeenCalledWith(
        createAdminAccountArgs,
      );

      expect(usersRepository.save).toHaveBeenCalled();
      expect(usersRepository.save).toHaveBeenCalledWith(createAdminAccountArgs);

      expect(verificationsRepository.create).toHaveBeenCalled();
      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: createAdminAccountArgs,
      });

      expect(verificationsRepository.save).toHaveBeenCalled();
      expect(verificationsRepository.save).toHaveBeenCalledWith({
        user: createAdminAccountArgs,
      });

      expect(mailService.sendVerificationEmail).toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('login', () => {
    const loginArgs = {
      email: 'test@test.com',
      password: 'test',
    };
    it('should fail if user does not exists', async () => {
      usersRepository.findOne.mockResolvedValue(undefined);

      const result = await service.login(loginArgs);

      expect(usersRepository.findOne).toHaveBeenCalled();
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toEqual({ ok: false, error: 'User not found' });
    });

    it('should fail if the password is wrong', async () => {
      const mockUser = {
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      usersRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.login(loginArgs);
      expect(result).toEqual({ ok: false, error: 'Wrong password' });
    });

    it('should return token if password correct', async () => {
      const mockUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.login(loginArgs);

      expect(jwtService.sign).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(Number) }),
      );
      expect(result).toEqual({ ok: true, token: 'signed token' });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.login(loginArgs);
      expect(result).toEqual({ ok: false, error: 'Could not log user in' });
    });
  });

  describe('findById', () => {
    const findOneArgs = {
      id: 1,
    };
    it('should find an existing user', async () => {
      usersRepository.findOneOrFail.mockResolvedValue(findOneArgs);
      const result = await service.findById(1);
      expect(result).toEqual({ ok: true, user: findOneArgs });
    });
    it('should fail if no user is found', async () => {
      usersRepository.findOneOrFail.mockRejectedValue(new Error());
      const result = await service.findById(1);
      expect(result).toEqual({ ok: false, error: 'User not found' });
    });
  });

  describe('editProfile', () => {
    it('should change email', async () => {
      const oldUser = {
        email: 'old@test.com',
        verified: true,
      };
      const editProfileArgs = {
        userId: 1,
        input: { email: 'new@test.com' },
      };
      const newVerification = {
        code: 'code',
      };
      const newUser = {
        verified: false,
        email: editProfileArgs.input.email,
      };

      usersRepository.findOne.mockResolvedValue(oldUser);
      verificationsRepository.create.mockReturnValue(newVerification);
      verificationsRepository.save.mockResolvedValue(newVerification);

      await service.editProfile(editProfileArgs.userId, editProfileArgs.input);

      expect(usersRepository.findOne).toHaveBeenCalled();
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId,
      );

      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: newUser,
      });
      expect(verificationsRepository.save).toHaveBeenCalledWith(
        newVerification,
      );

      expect(mailService.sendVerificationEmail).toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        newUser.email,
        newVerification.code,
      );
    });

    it('should change password', async () => {
      const oldUser = {
        password: 'oldPassword',
      };
      const editProfileArgs = {
        userId: 1,
        input: { password: 'newPassword' },
      };

      usersRepository.findOne.mockResolvedValue(oldUser);

      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );

      expect(usersRepository.save).toHaveBeenCalled();
      expect(usersRepository.save).toHaveBeenCalledWith(editProfileArgs.input);
      expect(result).toEqual({ ok: true });
    });

    it('should fail on exception', async () => {
      const editProfileArgs = {
        userId: 1,
        input: { password: 'newPassword' },
      };
      usersRepository.findOne.mockRejectedValue(new Error());

      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );

      expect(result).toEqual({ ok: false, error: 'Could not update profile' });
    });
  });

  describe('deleteUser', () => {
    const deleteUserArg = { userId: 1 };
    const mockUser = {
      id: 1,
      email: 'test@test.com',
    };
    it('should delete user', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.deleteUser(deleteUserArg.userId);

      expect(usersRepository.remove).toHaveBeenCalled();
      expect(usersRepository.remove).toBeCalledWith(mockUser);
      expect(result).toEqual({ ok: true });
    });

    it('should fail if user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(undefined);
      const result = await service.deleteUser(deleteUserArg.userId);
      expect(result).toEqual({ ok: false, error: 'User not found' });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.deleteUser(deleteUserArg.userId);
      expect(result).toEqual({ ok: false, error: 'Could not delete account' });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email', async () => {
      const mockedVerification = {
        user: {
          verified: false,
        },
        id: 1,
      };
      verificationsRepository.findOne.mockResolvedValue(mockedVerification);

      const result = await service.verifyEmail('');

      expect(verificationsRepository.findOne).toHaveBeenCalled();
      expect(verificationsRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(usersRepository.save).toHaveBeenCalled();
      expect(usersRepository.save).toHaveBeenCalledWith({ verified: true });

      expect(verificationsRepository.delete).toHaveBeenCalled();
      expect(verificationsRepository.delete).toHaveBeenCalledWith(
        mockedVerification.id,
      );
      expect(result).toEqual({ ok: true });
    });

    it('should fail on verification not found', async () => {
      verificationsRepository.findOne.mockResolvedValue(undefined);
      const result = await service.verifyEmail('');
      expect(result).toEqual({ ok: false, error: 'Verification not found' });
    });

    it('should fail on exception', async () => {
      verificationsRepository.findOne.mockRejectedValue(new Error());
      const result = await service.verifyEmail('');
      expect(result).toEqual({ ok: false, error: 'Could not verify email' });
    });
  });
});
