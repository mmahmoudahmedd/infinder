export const PLATFORM_FEE_RATE = 0.0025;
export const MIN_FEE_EGP = 1.00;

export function calculateFee(amount) {
  const raw = parseFloat((amount * PLATFORM_FEE_RATE).toFixed(2));
  return Math.max(raw, MIN_FEE_EGP);
}
