import bcrypt from 'bcryptjs';

export async function hashPassword(plain: string) {
  const rounds = 10;
  return await bcrypt.hash(plain, rounds); 
}

export async function verifyPassword(plain: string, hash: string) { 
  return await bcrypt.compare(plain, hash);
}