import { Test } from '@nestjs/testing';
import { getCustomRepositoryToken, getRepositoryToken } from '@nestjs/typeorm';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateOrderInput } from './dtos/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderService } from './orders.service';

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

type MockCustomRepository<T = any> = Partial<Record<keyof T, jest.Mock>>;

const mockClientUser: User = {
  createdAt: null,
  updatedAt: null,
  id: 0,
  email: 'client@test.com',
  password: 'test',
  verified: true,
  restaurants: [],
  orders: [],
  rides: [],
  role: UserRole.Client,
  hashPassword: jest.fn(),
  checkPassword: jest.fn(),
};

describe('Orders Service', () => {
  let service: OrderService;
  let ordersRepository: MockRepository<Order>;
  let orderItemsRepository: MockRepository<OrderItem>;
  let dishesRepository: MockRepository<Dish>;
  let restaurantsRepository: MockCustomRepository<RestaurantRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            ...mockRepository(),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {
            ...mockRepository(),
          },
        },
        {
          provide: getRepositoryToken(Dish),
          useValue: {
            ...mockRepository(),
          },
        },
        {
          provide: getCustomRepositoryToken(RestaurantRepository),
          useValue: {
            ...mockRepository(),
            getRestaurantsByCategory: jest.fn(),
            getRestaurantsByPage: jest.fn(),
            getRestaurantsByQuery: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    ordersRepository = module.get(getRepositoryToken(Order));
    orderItemsRepository = module.get(getRepositoryToken(OrderItem));
    dishesRepository = module.get(getRepositoryToken(Dish));
    restaurantsRepository = module.get(
      getCustomRepositoryToken(RestaurantRepository),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const createOrderArgs: CreateOrderInput = {
      restaurantId: 0,
      items: [{ dishId: 0 }],
    };

    it('should fail if restaurant does not exists', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);
      const result = await service.createOrder(mockClientUser, createOrderArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createOrderArgs.restaurantId,
      );
      expect(result).toEqual({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should fail if dish does not exists', async () => {
      restaurantsRepository.findOne.mockResolvedValue({ id: 0 });
      dishesRepository.findOne.mockResolvedValue(undefined);
      const result = await service.createOrder(mockClientUser, createOrderArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createOrderArgs.restaurantId,
      );
      expect(dishesRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual({
        ok: false,
        error: 'Dish not found',
      });
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createOrder(mockClientUser, createOrderArgs);

      expect(restaurantsRepository.findOne).toHaveBeenCalled();
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith(
        createOrderArgs.restaurantId,
      );
      expect(result).toEqual({
        ok: false,
        error: 'Could not create order',
      });
    });
  });
});
