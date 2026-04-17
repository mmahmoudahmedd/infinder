import { randomBytes } from 'crypto';

export function generateDepositRef(prefix = 'INVG') {
  const n = randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${n.slice(0, 4)}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 16);
}
