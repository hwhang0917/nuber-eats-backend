import { UserRole } from 'src/users/entities/user.entity';

export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'admin',
    role: UserRole.Admin,
  },
  client: {
    email: 'client@test.com',
    password: 'client',
    role: UserRole.Client,
  },
  owner: {
    email: 'owner@test.com',
    password: 'owner',
    role: UserRole.Owner,
  },
  delivery: {
    email: 'delivery@test.com',
    password: 'delivery',
    role: UserRole.Delivery,
  },
};
