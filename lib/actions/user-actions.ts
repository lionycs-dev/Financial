'use server';

import { UserRepository } from '@/lib/repositories/user-repository';

const userRepository = new UserRepository();

export async function getUsers() {
  try {
    return await userRepository.getAll();
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw new Error('Failed to fetch users');
  }
}

export async function createUser(data: { email: string; name: string }) {
  try {
    return await userRepository.create(data);
  } catch (error) {
    console.error('Failed to create user:', error);
    throw new Error('Failed to create user');
  }
}
