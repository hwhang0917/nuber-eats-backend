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
    const mockPrice = {
      dishPrice: 1000,
      optionOne_choiceOnePrice: 500,
      optionTwoPrice: 500,
    };

    const mockRestaurant = { id: 0 };

    const mockDish = {
      id: 0,
      name: 'testDish',
      description: 'testDesc',
      price: mockPrice.dishPrice,
      restaurantId: mockRestaurant.id,
      options: [
        {
          name: 'testOption_1',
          choices: [
            {
              name: 'testChoice_1',
              additionalCharge: mockPrice.optionOne_choiceOnePrice,
            },
          ],
        },
        {
          name: 'testOption_2',
          additionalCharge: mockPrice.optionTwoPrice,
        },
      ],
    };

    const optionInputOne = {
      name: mockDish.options[0].name,
      choice: mockDish.options[0].choices[0].name,
    };
    const optionInputTwo = { name: mockDish.options[1].name };

    const createOrderArgs: CreateOrderInput = {
      restaurantId: mockDish.restaurantId,
      items: [
        {
          dishId: mockDish.id,
          options: [optionInputOne, optionInputTwo],
        },
      ],
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
      restaurantsRepository.findOne.mockResolvedValue(mockRestaurant);
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

    it('should create order with options', async () => {
      restaurantsRepository.findOne.mockResolvedValue(mockRestaurant);
      dishesRepository.findOne.mockResolvedValue(mockDish);

      const mockOrderItem = { dish: mockDish };
      orderItemsRepository.save.mockResolvedValue(mockOrderItem);

      const mockOrder = {
        customer: mockClientUser,
        restaurant: mockRestaurant,
        total: mockPrice.dishPrice,
        items: [mockOrderItem],
      };
      ordersRepository.create.mockResolvedValue(mockOrder);

      const result = await service.createOrder(mockClientUser, createOrderArgs);

      expect(result).toEqual({ ok: true });
      expect(orderItemsRepository.create).toHaveBeenCalled();
      expect(orderItemsRepository.save).toHaveBeenCalled();
      expect(ordersRepository.create).toHaveBeenCalled();
      expect(ordersRepository.save).toHaveBeenCalled();
    });

    it('should create order with no options', async () => {
      createOrderArgs.items[0].options.length = 0;
      restaurantsRepository.findOne.mockResolvedValue(mockRestaurant);
      dishesRepository.findOne.mockResolvedValue(mockDish);

      const mockOrderItem = { dish: mockDish };
      orderItemsRepository.save.mockResolvedValue(mockOrderItem);

      const mockOrder = {
        customer: mockClientUser,
        restaurant: mockRestaurant,
        total: mockPrice.dishPrice,
        items: [mockOrderItem],
      };
      ordersRepository.create.mockResolvedValue(mockOrder);

      const result = await service.createOrder(mockClientUser, createOrderArgs);

      expect(result).toEqual({ ok: true });
      expect(orderItemsRepository.create).toHaveBeenCalled();
      expect(orderItemsRepository.save).toHaveBeenCalled();
      expect(ordersRepository.create).toHaveBeenCalled();
      expect(ordersRepository.save).toHaveBeenCalled();
    });
  });
});
