import * as faker from 'faker';
import { Test } from '@nestjs/testing';
import { getCustomRepositoryToken, getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateRestaurantInput } from './dtos/create-restaurant.dto';
import { EditRestaurantInput } from './dtos/edit-restaurant.dto';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantService } from './restaurants.service';
import { Category } from './entities/category.entity';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
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
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    role: UserRole.Owner,
    verified: true,
    restaurants: [],
    hashPassword: jest.fn(),
    checkPassword: jest.fn(),
  };

  const mockCategory: Category = {
    id: 0,
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    name: faker.lorem.words(),
    icon: faker.image.food(),
    slug: faker.lorem.slug(),
    restaurants: [],
  };

  const mockRestaurant: Restaurant = {
    id: 0,
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    name: faker.company.companyName(),
    coverImage: faker.image.business(),
    address: faker.address.city(),
    category: mockCategory,
    owner: mockUser,
    ownerId: mockUser.id,
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
          useValue: {
            ...mockRepository(),
            getOrCreate: jest.fn(),
          },
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
      categoryName: mockCategory.name,
      name: mockRestaurant.name,
      coverImage: mockRestaurant.coverImage,
      address: mockRestaurant.address,
    };

    it('should create a new restaurant', async () => {
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

  describe('deleteRestaurant', () => {
    const deleteRestaurantInput = { restaurantId: 0 };

    it("should fail if restaurant doesn't exist", async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);
      const result = await service.deleteRestaurant(
        mockUser,
        deleteRestaurantInput,
      );

      expect(result).toEqual({ ok: false, error: 'Restaurant not found' });
      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        deleteRestaurantInput.restaurantId,
      );
    });

    it('should fail if user does not own the restaurnt', async () => {
      restaurantsRepository.findOne.mockResolvedValue({ ownerId: 1 });
      const result = await service.deleteRestaurant(
        mockUser,
        deleteRestaurantInput,
      );

      expect(result).toEqual({
        ok: false,
        error: "You cannot delete restaurant you don't own",
      });
      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        deleteRestaurantInput.restaurantId,
      );
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());
      const result = await service.deleteRestaurant(
        mockUser,
        deleteRestaurantInput,
      );

      expect(result).toEqual({
        ok: false,
        error: 'Could not delete restaurant',
      });
      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        deleteRestaurantInput.restaurantId,
      );
    });

    it('should delete restaurant', async () => {
      const mockRestaurant = { ownerId: mockUser.id };

      restaurantsRepository.findOne.mockResolvedValue(mockRestaurant);
      restaurantsRepository.remove.mockResolvedValue(true);
      const result = await service.deleteRestaurant(
        mockUser,
        deleteRestaurantInput,
      );

      expect(result).toEqual({ ok: true });
      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        deleteRestaurantInput.restaurantId,
      );
      expect(restaurantsRepository.remove).toHaveBeenCalled();
      expect(restaurantsRepository.remove).toHaveBeenCalledWith(mockRestaurant);
    });
  });

  describe('allCategories', () => {
    it('should fail on exception', async () => {
      categoriesRepository.find.mockRejectedValue(new Error('ee'));
      const result = await service.allCategories();

      expect(categoriesRepository.find).toHaveBeenCalled();
      expect(result).toEqual({
        ok: false,
        error: 'Could not load categories',
      });
    });

    it('should find list of all categories', async () => {
      const mockCategories = ['test1', 'test2'];

      categoriesRepository.find.mockResolvedValue(mockCategories);
      const result = await service.allCategories();

      expect(categoriesRepository.find).toHaveBeenCalled();
      expect(result).toEqual({
        ok: true,
        categories: mockCategories,
      });
    });
  });

  describe('countRestaurants', () => {
    it('should get number of restaurant counts', async () => {
      const mockRestaurantCount = 10;

      restaurantsRepository.count.mockResolvedValue(mockRestaurantCount);
      const result = await service.countRestaurants(mockCategory);

      expect(restaurantsRepository.count).toHaveBeenCalled();
      expect(restaurantsRepository.count).toHaveBeenCalledWith({
        category: mockCategory,
      });
      expect(result).toEqual(mockRestaurantCount);
    });
  });

  describe('findCategoryBySlug', () => {
    const findCategoryBySlugArg = { slug: mockCategory.slug };

    it("should fail if category doesn't exist", async () => {
      categoriesRepository.findOne.mockResolvedValue(undefined);
      const result = await service.findCategoryBySlug(findCategoryBySlugArg);

      expect(categoriesRepository.findOne).toHaveBeenCalled();
      expect(categoriesRepository.findOne).toHaveBeenCalledWith(
        findCategoryBySlugArg,
        {
          relations: ['restaurants'],
        },
      );
      expect(result).toEqual({
        ok: false,
        error: 'Category not found',
      });
    });

    it('should fail on exception', async () => {
      categoriesRepository.findOne.mockRejectedValue(new Error());
      const result = await service.findCategoryBySlug(findCategoryBySlugArg);

      expect(categoriesRepository.findOne).toHaveBeenCalled();
      expect(categoriesRepository.findOne).toHaveBeenCalledWith(
        findCategoryBySlugArg,
        {
          relations: ['restaurants'],
        },
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not find category',
      });
    });

    it('should get category', async () => {
      categoriesRepository.findOne.mockResolvedValue(mockCategory);
      const result = await service.findCategoryBySlug(findCategoryBySlugArg);

      expect(categoriesRepository.findOne).toHaveBeenCalled();
      expect(categoriesRepository.findOne).toHaveBeenCalledWith(
        findCategoryBySlugArg,
        {
          relations: ['restaurants'],
        },
      );
      expect(result).toEqual({
        ok: true,
        category: mockCategory,
      });
    });
  });
});
