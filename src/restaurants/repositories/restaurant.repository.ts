import { EntityRepository, Raw, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Restaurant } from '../entities/restaurant.entity';
import { PAGINATION_MAX } from 'src/common/dtos/pagination.dto';

@EntityRepository(Restaurant)
export class RestaurantRepository extends Repository<Restaurant> {
  async getRestaurantsByCategory(
    category: Category,
    page: number,
  ): Promise<Restaurant[]> {
    return await this.find({
      where: { category },
      take: PAGINATION_MAX,
      skip: (page - 1) * PAGINATION_MAX,
    });
  }

  async getRestaurantsByPage(page: number): Promise<[Restaurant[], number]> {
    return await this.findAndCount({
      skip: (page - 1) * PAGINATION_MAX,
      take: PAGINATION_MAX,
    });
  }

  async getRestaurantsByQuery(
    query: string,
    page: number,
  ): Promise<[Restaurant[], number]> {
    return await this.findAndCount({
      where: { name: Raw((name) => `${name} ILIKE '%${query}%'`) },
      skip: (page - 1) * PAGINATION_MAX,
      take: PAGINATION_MAX,
    });
  }
}
