import crypto from 'crypto';

export function signState(secret: string, payload: any) {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifyState(secret: string, state: string) {
  const [b64, sig] = state.split('.', 2);
  if (!b64 || !sig) throw new Error('bad_state');
  const expSig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expSig))) throw new Error('bad_state_sig');
  const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
  return payload as { redirectTo: string; ts: number };
}