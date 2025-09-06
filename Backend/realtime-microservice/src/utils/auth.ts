import jwt from 'jsonwebtoken';

type JWTPayload = { sub: number | string; username: string };

export function verifyToken(token: string, secret: string): { userId: number; username: string } {
  const payload = jwt.verify(token, secret) as JWTPayload;
  const userId = Number(payload.sub);
  const username = payload.username;
  if (!userId || !username) throw new Error('Invalid token');
  return { userId, username };
}
