import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PAGINATION_MAX } from 'src/common/common.constants';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
    private readonly restaurants: RestaurantRepository,
  ) {}

  async createOrder(
    customer: User,
    { restaurantId, items }: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId);
      if (!restaurant) {
        return {
          ok: false,
          error: 'Restaurant not found',
        };
      }

      let orderTotal = 0;
      const orderItems: OrderItem[] = [];
      for (const item of items) {
        const dish = await this.dishes.findOne(item.dishId);
        if (!dish) {
          return { ok: false, error: 'Dish not found' };
        }
        let dishTotal = dish.price;
        for (const itemOption of item.options) {
          const dishOption = dish.options.find(
            (dishOption) => dishOption.name === itemOption.name,
          );
          if (dishOption) {
            if (dishOption.additionalCharge) {
              dishTotal += dishOption.additionalCharge;
            } else {
              const dishOptionChoice = dishOption.choices.find(
                (optionChoice) => optionChoice.name === itemOption.choice,
              );
              if (dishOptionChoice) {
                if (dishOptionChoice.additionalCharge) {
                  dishTotal += dishOptionChoice.additionalCharge;
                }
              }
            }
          }
        }
        orderTotal += dishTotal;
        const orderItem = await this.orderItems.save(
          this.orderItems.create({ dish, options: item.options }),
        );
        orderItems.push(orderItem);
      }

      const newOrder = this.orders.create({
        customer,
        restaurant,
        total: orderTotal,
        items: orderItems,
      });
      await this.orders.save(newOrder);

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: 'Could not create order',
      };
    }
  }

  async getOrders(
    user: User,
    { status }: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    try {
      let orders: Order[];
      if (user.role === UserRole.Client) {
        orders = await this.orders.find({
          where: {
            customer: user,
          },
        });
      } else if (user.role === UserRole.Delivery) {
        orders = await this.orders.find({
          where: {
            driver: user,
          },
        });
      } else if (user.role === UserRole.Owner) {
        const restaurants = await this.restaurants.find({
          where: {
            owner: user,
          },
          relations: ['orders'],
        });
        orders = restaurants.map((restaurant) => restaurant.orders).flat(1);
      }

      return {
        ok: true,
        orders,
      };
    } catch (error) {
      return {
        ok: false,
        error: 'Could not get orders',
      };
    }
  }
}
