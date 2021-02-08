import { Test } from '@nestjs/testing';
import { getCustomRepositoryToken, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    it.todo('should create a new restaurant');
  });

  describe('editRestaurant', () => {
    it.todo('should edit restaurant');
  });
});
