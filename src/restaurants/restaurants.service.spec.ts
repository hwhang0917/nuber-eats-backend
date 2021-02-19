import * as faker from 'faker';
import { Test } from '@nestjs/testing';
import { getCustomRepositoryToken, getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { CreateRestaurantInput } from './dtos/create-restaurant.dto';
import { EditRestaurantInput } from './dtos/edit-restaurant.dto';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantService } from './restaurants.service';
import { Category } from './entities/category.entity';
import { PAGINATION_MAX } from 'src/common/common.constants';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { Dish } from './entities/dish.entity';
import { Repository } from 'typeorm';
import { CreateDishInput } from './dtos/create-dish.dto';
import { EditDishInput } from './dtos/edit-dish.dto';
import { DeleteDishInput } from './dtos/delete-dish.dt';

const mockRepository = () => ({
  find: jest.fn(),
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
type MockCustomRepository<T> = Partial<Record<keyof T, jest.Mock>>;

describe('Restaurants Service', () => {
  let service: RestaurantService;
  let restaurantsRepository: MockCustomRepository<RestaurantRepository>;
  let categoriesRepository: MockCustomRepository<CategoryRepository>;
  let dishRepository: MockRepository<Dish>;

  const mockUser: User = {
    id: 0,
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    role: UserRole.Owner,
    verified: true,
    restaurants: [],
    orders: [],
    rides: [],
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
    menu: [],
    orders: [],
  };

  const mockRestaurants = ['restaurantA', 'restaurantB', 'restaurantC'];

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RestaurantService,
        {
          provide: getCustomRepositoryToken(RestaurantRepository),
          useValue: {
            ...mockRepository(),
            getRestaurantsByCategory: jest.fn(),
            getRestaurantsByPage: jest.fn(),
            getRestaurantsByQuery: jest.fn(),
          },
        },
        {
          provide: getCustomRepositoryToken(CategoryRepository),
          useValue: {
            ...mockRepository(),
            getOrCreate: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Dish),
          useValue: {
            ...mockRepository(),
          },
        },
      ],
    }).compile();
    service = module.get<RestaurantService>(RestaurantService);
    restaurantsRepository = module.get(
      getCustomRepositoryToken(RestaurantRepository),
    );
    categoriesRepository = module.get(
      getCustomRepositoryToken(CategoryRepository),
    );
    dishRepository = module.get(getRepositoryToken(Dish));
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
      restaurantsRepository.findOne.mockResolvedValue({ ownerId: 1 });
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

    it('should edit restaurant without categoryName', async () => {
      restaurantsRepository.findOne.mockResolvedValue({ ownerId: mockUser.id });
      const result = await service.editRestaurant(mockUser, editRestaurantArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        editRestaurantArgs.restaurantId,
        {
          loadRelationIds: true,
        },
      );
      expect(restaurantsRepository.save).toHaveBeenCalled();
      expect(restaurantsRepository.save).toHaveBeenCalledWith([
        {
          id: editRestaurantArgs.restaurantId,
          ...editRestaurantArgs,
        },
      ]);
      expect(result).toEqual({ ok: true });
    });

    it('should edit restaurant with categoryName', async () => {
      const editRestaurantArgsWithCategory = {
        ...editRestaurantArgs,
        categoryName: 'Test Category',
      };
      const mockCategory = {
        name: editRestaurantArgsWithCategory.categoryName,
        slug: 'test-category',
      };

      restaurantsRepository.findOne.mockResolvedValue({ ownerId: mockUser.id });
      categoriesRepository.getOrCreate.mockResolvedValue(mockCategory);
      const result = await service.editRestaurant(
        mockUser,
        editRestaurantArgsWithCategory,
      );

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        editRestaurantArgsWithCategory.restaurantId,
        {
          loadRelationIds: true,
        },
      );
      expect(categoriesRepository.getOrCreate).toHaveBeenCalled();
      expect(categoriesRepository.getOrCreate).toHaveBeenCalledWith(
        editRestaurantArgsWithCategory.categoryName,
      );
      expect(restaurantsRepository.save).toHaveBeenCalled();
      expect(restaurantsRepository.save).toHaveBeenCalledWith([
        {
          id: editRestaurantArgsWithCategory.restaurantId,
          ...editRestaurantArgsWithCategory,
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
    const findCategoryBySlugArg = { slug: mockCategory.slug, page: 1 };

    it("should fail if category doesn't exist", async () => {
      categoriesRepository.findOne.mockResolvedValue(undefined);
      const result = await service.findCategoryBySlug(findCategoryBySlugArg);

      expect(categoriesRepository.findOne).toHaveBeenCalled();
      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        slug: findCategoryBySlugArg.slug,
      });
      expect(result).toEqual({
        ok: false,
        error: 'Category not found',
      });
    });

    it('should fail on exception', async () => {
      categoriesRepository.findOne.mockRejectedValue(new Error());
      const result = await service.findCategoryBySlug(findCategoryBySlugArg);

      expect(categoriesRepository.findOne).toHaveBeenCalled();
      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        slug: findCategoryBySlugArg.slug,
      });
      expect(result).toEqual({
        ok: false,
        error: 'Could not find category',
      });
    });

    it('should get category', async () => {
      const mockPageCount = 5;
      const countRestaurantsSpy = jest.spyOn(service, 'countRestaurants');
      countRestaurantsSpy.mockResolvedValue(mockPageCount);

      categoriesRepository.findOne.mockResolvedValue(mockCategory);
      restaurantsRepository.getRestaurantsByCategory.mockResolvedValue([]);
      const result = await service.findCategoryBySlug(findCategoryBySlugArg);

      expect(categoriesRepository.findOne).toHaveBeenCalled();
      expect(categoriesRepository.findOne).toHaveBeenCalledWith({
        slug: findCategoryBySlugArg.slug,
      });
      expect(restaurantsRepository.getRestaurantsByCategory).toHaveBeenCalled();
      expect(
        restaurantsRepository.getRestaurantsByCategory,
      ).toHaveBeenCalledWith(mockCategory, findCategoryBySlugArg.page);
      expect(countRestaurantsSpy).toHaveBeenCalled();
      expect(countRestaurantsSpy).toHaveBeenCalledWith(mockCategory);
      expect(result).toEqual({
        ok: true,
        category: mockCategory,
        totalPages: Math.ceil(mockPageCount / PAGINATION_MAX),
      });
    });
  });

  describe('allRestaurants', () => {
    const allRestaurantsArgs = { page: 1 };

    it('should fail on exception', async () => {
      restaurantsRepository.getRestaurantsByPage.mockRejectedValue(new Error());
      const result = await service.allRestaurants(allRestaurantsArgs);

      expect(restaurantsRepository.getRestaurantsByPage).toHaveBeenCalled();
      expect(restaurantsRepository.getRestaurantsByPage).toHaveBeenCalledWith(
        allRestaurantsArgs.page,
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not load restaurants',
      });
    });

    it('should get array of all restaurants', async () => {
      restaurantsRepository.getRestaurantsByPage.mockResolvedValue([
        mockRestaurants,
        mockRestaurants.length,
      ]);
      const result = await service.allRestaurants(allRestaurantsArgs);

      expect(restaurantsRepository.getRestaurantsByPage).toHaveBeenCalled();
      expect(restaurantsRepository.getRestaurantsByPage).toHaveBeenCalledWith(
        allRestaurantsArgs.page,
      );
      expect(result).toEqual({
        ok: true,
        results: mockRestaurants,
        totalPages: Math.ceil(mockRestaurants.length / PAGINATION_MAX),
        totalResults: mockRestaurants.length,
      });
    });
  });

  describe('findRestaurantById', () => {
    const findRestaurantByIdArgs = { restaurantId: 0 };

    it("should fail if restaurant doesn't exist", async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);
      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        {
          id: findRestaurantByIdArgs.restaurantId,
        },
        { relations: ['menu'] },
      );
      expect(result).toEqual({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());
      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        {
          id: findRestaurantByIdArgs.restaurantId,
        },
        { relations: ['menu'] },
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not find restaurant',
      });
    });

    it('should get restaurant by Id', async () => {
      restaurantsRepository.findOne.mockResolvedValue(mockRestaurant);
      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        {
          id: findRestaurantByIdArgs.restaurantId,
        },
        { relations: ['menu'] },
      );
      expect(result).toEqual({
        ok: true,
        restaurant: mockRestaurant,
      });
    });
  });

  describe('searchRestaurantByName', () => {
    const searchRestaurantByNameArgs = {
      query: 'test',
      page: 1,
    };

    it('should fail on exception', async () => {
      restaurantsRepository.getRestaurantsByQuery.mockRejectedValue(
        new Error(),
      );
      const result = await service.searchRestaurantByName(
        searchRestaurantByNameArgs,
      );

      expect(restaurantsRepository.getRestaurantsByQuery).toHaveBeenCalled();
      expect(restaurantsRepository.getRestaurantsByQuery).toHaveBeenCalledWith(
        searchRestaurantByNameArgs.query,
        searchRestaurantByNameArgs.page,
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not search for restaurant',
      });
    });

    it('should search and get restaurant by name', async () => {
      restaurantsRepository.getRestaurantsByQuery.mockResolvedValue([
        mockRestaurants,
        mockRestaurants.length,
      ]);
      const result = await service.searchRestaurantByName(
        searchRestaurantByNameArgs,
      );

      expect(restaurantsRepository.getRestaurantsByQuery).toHaveBeenCalled();
      expect(restaurantsRepository.getRestaurantsByQuery).toHaveBeenCalledWith(
        searchRestaurantByNameArgs.query,
        searchRestaurantByNameArgs.page,
      );
      expect(result).toEqual({
        ok: true,
        restaurants: mockRestaurants,
        totalResults: mockRestaurants.length,
        totalPages: Math.ceil(mockRestaurants.length / PAGINATION_MAX),
      });
    });
  });

  describe('createDish', () => {
    const createDishArgs: CreateDishInput = {
      restaurantId: 0,
      name: 'testDish',
      price: 50000,
      description: 'test',
      options: [
        {
          name: 'testOption',
          choices: [
            { name: 'testChoice_1', additionalCharge: 1 },
            { name: 'testChoice_2', additionalCharge: 2 },
          ],
        },
      ],
    };

    it("should fail if restaurant doesn't exist", async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);
      const result = await service.createDish(mockUser, createDishArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createDishArgs.restaurantId,
      );
      expect(result).toEqual({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should fail if user does not own the restaurnt', async () => {
      restaurantsRepository.findOne.mockResolvedValue({ ownerId: 1 });
      const result = await service.createDish(mockUser, createDishArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createDishArgs.restaurantId,
      );
      expect(result).toEqual({
        ok: false,
        error: "You cannot create dish for restaurant you don't own",
      });
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createDish(mockUser, createDishArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createDishArgs.restaurantId,
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not create dish',
      });
    });

    it('should create new dish for restaurant', async () => {
      restaurantsRepository.findOne.mockResolvedValue({ ownerId: mockUser.id });
      const result = await service.createDish(mockUser, createDishArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createDishArgs.restaurantId,
      );
      expect(result).toEqual({
        ok: true,
      });
    });
  });

  describe('editDish', () => {
    const editDishArgs: EditDishInput = {
      dishId: 0,
      name: 'someNewName',
    };

    it("should fail if dish doesn't exist", async () => {
      dishRepository.findOne.mockResolvedValue(undefined);
      const result = await service.editDish(mockUser, editDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalled();
      expect(dishRepository.findOne).toHaveBeenCalledWith(editDishArgs.dishId, {
        relations: ['restaurant'],
      });
      expect(result).toEqual({
        ok: false,
        error: 'Dish not found',
      });
    });

    it('should fail if user does not own the restaurnt', async () => {
      dishRepository.findOne.mockResolvedValue({ restaurant: { ownerId: 1 } });
      const result = await service.editDish(mockUser, editDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalled();
      expect(dishRepository.findOne).toHaveBeenCalledWith(editDishArgs.dishId, {
        relations: ['restaurant'],
      });
      expect(result).toEqual({
        ok: false,
        error: "You cannot edit dish for restaurant you don't own",
      });
    });

    it('should fail on exception', async () => {
      dishRepository.findOne.mockRejectedValue(new Error());
      const result = await service.editDish(mockUser, editDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalled();
      expect(dishRepository.findOne).toHaveBeenCalledWith(editDishArgs.dishId, {
        relations: ['restaurant'],
      });
      expect(result).toEqual({
        ok: false,
        error: 'Could not edit dish',
      });
    });

    it('should edit dish of restaurant', async () => {
      dishRepository.findOne.mockResolvedValue({
        restaurant: { ownerId: mockUser.id },
      });
      const result = await service.editDish(mockUser, editDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalled();
      expect(dishRepository.findOne).toHaveBeenCalledWith(editDishArgs.dishId, {
        relations: ['restaurant'],
      });
      expect(dishRepository.save).toHaveBeenCalled();
      expect(dishRepository.save).toHaveBeenCalledWith([
        {
          id: editDishArgs.dishId,
          ...editDishArgs,
        },
      ]);
      expect(result).toEqual({
        ok: true,
      });
    });
  });

  describe('deleteDish', () => {
    const deleteDishArgs: DeleteDishInput = {
      dishId: 0,
    };

    it("should fail if dish doesn't exist", async () => {
      dishRepository.findOne.mockResolvedValue(undefined);
      const result = await service.deleteDish(mockUser, deleteDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalled();
      expect(dishRepository.findOne).toHaveBeenCalledWith(
        deleteDishArgs.dishId,
        {
          relations: ['restaurant'],
        },
      );
      expect(result).toEqual({
        ok: false,
        error: 'Dish not found',
      });
    });

    it('should fail if user does not own the restaurnt', async () => {
      dishRepository.findOne.mockResolvedValue({ restaurant: { ownerId: 1 } });
      const result = await service.deleteDish(mockUser, deleteDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalled();
      expect(dishRepository.findOne).toHaveBeenCalledWith(
        deleteDishArgs.dishId,
        {
          relations: ['restaurant'],
        },
      );
      expect(result).toEqual({
        ok: false,
        error: "You cannot delete dish for restaurant you don't own",
      });
    });

    it('should fail on exception', async () => {
      dishRepository.findOne.mockRejectedValue(new Error());
      const result = await service.deleteDish(mockUser, deleteDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalled();
      expect(dishRepository.findOne).toHaveBeenCalledWith(
        deleteDishArgs.dishId,
        {
          relations: ['restaurant'],
        },
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not delete dish',
      });
    });

    it('should delete dish of restaurant', async () => {
      dishRepository.findOne.mockResolvedValue({
        restaurant: { ownerId: mockUser.id },
      });
      const result = await service.deleteDish(mockUser, deleteDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalled();
      expect(dishRepository.findOne).toHaveBeenCalledWith(
        deleteDishArgs.dishId,
        {
          relations: ['restaurant'],
        },
      );
      expect(dishRepository.delete).toHaveBeenCalled();
      expect(dishRepository.delete).toHaveBeenCalledWith(deleteDishArgs.dishId);
      expect(result).toEqual({
        ok: true,
      });
    });
  });
});
