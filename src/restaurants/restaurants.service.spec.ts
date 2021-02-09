import { Test } from '@nestjs/testing';
import { getCustomRepositoryToken, getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateRestaurantInput } from './dtos/create-restaurant.dto';
import { EditRestaurantInput } from './dtos/edit-restaurant.dto';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantService } from './restaurants.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
type MockCategoryRepository = Partial<
  Record<keyof CategoryRepository, jest.Mock>
>;

describe('Restaurants Service', () => {
  let service: RestaurantService;
  let restaurantsRepository: MockRepository<Restaurant>;
  let categoriesRepository: MockCategoryRepository;

  const mockUser: User = {
    id: 0,
    createdAt: undefined,
    updatedAt: undefined,
    email: 'owner@test.com',
    password: '1234',
    role: UserRole.Owner,
    verified: true,
    restaurants: [],
    hashPassword: jest.fn(),
    checkPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RestaurantService,
        {
          provide: getRepositoryToken(Restaurant),
          useValue: mockRepository(),
        },
        {
          provide: getCustomRepositoryToken(CategoryRepository),
          useValue: { ...mockRepository(), getOrCreate: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<RestaurantService>(RestaurantService);
    restaurantsRepository = module.get(getRepositoryToken(Restaurant));
    categoriesRepository = module.get(
      getCustomRepositoryToken(CategoryRepository),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRestaruant', () => {
    const createRestaurantArgs: CreateRestaurantInput = {
      categoryName: 'Test Category',
      name: 'test',
      coverImage: 'test.jpg',
      address: 'test',
    };

    it('should create a new restaurant', async () => {
      const mockCategory = {
        name: createRestaurantArgs.categoryName,
        icon: 'test.jpg',
        slug: 'test-category',
      };

      const mockNewRestaurant = {
        ...createRestaurantArgs,
        ownerId: 0,
        category: mockCategory,
      };

      restaurantsRepository.create.mockReturnValue(mockNewRestaurant);
      categoriesRepository.getOrCreate.mockResolvedValue(mockCategory);

      const result = await service.createRestaurant(
        mockUser,
        createRestaurantArgs,
      );

      expect(result).toEqual({ ok: true });
      expect(restaurantsRepository.create).toHaveBeenCalled();
      expect(restaurantsRepository.create).toHaveBeenCalledWith(
        createRestaurantArgs,
      );
      expect(categoriesRepository.getOrCreate).toHaveBeenCalled();
      expect(categoriesRepository.getOrCreate).toHaveBeenCalledWith(
        createRestaurantArgs.categoryName,
      );
      expect(restaurantsRepository.save).toHaveBeenCalled();
      expect(restaurantsRepository.save).toHaveBeenCalledWith(
        mockNewRestaurant,
      );
    });

    it('should fail on exception', async () => {
      restaurantsRepository.save.mockRejectedValue(new Error());

      const result = await service.createRestaurant(
        mockUser,
        createRestaurantArgs,
      );

      expect(result).toEqual({
        ok: false,
        error: 'Could not create restaurant',
      });
    });
  });

  describe('editRestaurant', () => {
    const editRestaurantArgs: EditRestaurantInput = {
      categoryName: 'Test Category',
      name: 'test',
      coverImage: 'test.jpg',
      address: 'test',
      restaurantId: 0,
    };

    it("should fail if restaurant doesn't exist", async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);
      const result = await service.editRestaurant(mockUser, editRestaurantArgs);

      expect(result).toEqual({ ok: false, error: 'Restaurant not found' });
      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        editRestaurantArgs.restaurantId,
        {
          loadRelationIds: true,
        },
      );
    });

    it('should fail if user does not own the restaurnt', async () => {
      restaurantsRepository.findOne.mockResolvedValue({ ownderId: 1 });
      const result = await service.editRestaurant(mockUser, editRestaurantArgs);

      expect(result).toEqual({
        ok: false,
        error: "You cannot edit restaurant you don't own",
      });
      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        editRestaurantArgs.restaurantId,
        {
          loadRelationIds: true,
        },
      );
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());
      const result = await service.editRestaurant(mockUser, editRestaurantArgs);

      expect(result).toEqual({ ok: false, error: 'Could not edit restaurant' });
      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        editRestaurantArgs.restaurantId,
        {
          loadRelationIds: true,
        },
      );
    });

    it('should edit restaurant', async () => {
      const mockCategory = {
        name: editRestaurantArgs.categoryName,
        slug: 'test-category',
      };
      restaurantsRepository.findOne.mockResolvedValue({ ownerId: mockUser.id });
      categoriesRepository.getOrCreate.mockResolvedValue(mockCategory);
      const result = await service.editRestaurant(mockUser, editRestaurantArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        editRestaurantArgs.restaurantId,
        {
          loadRelationIds: true,
        },
      );
      expect(categoriesRepository.getOrCreate).toHaveBeenCalled();
      expect(categoriesRepository.getOrCreate).toHaveBeenCalledWith(
        editRestaurantArgs.categoryName,
      );
      expect(restaurantsRepository.save).toHaveBeenCalled();
      expect(restaurantsRepository.save).toHaveBeenCalledWith([
        {
          id: editRestaurantArgs.restaurantId,
          ...editRestaurantArgs,
          ...{ category: mockCategory },
        },
      ]);
      expect(result).toEqual({ ok: true });
    });
  });
});
