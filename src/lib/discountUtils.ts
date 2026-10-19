import type { CartItem, Customer, Discount, DiscountCondition } from '../types';

export function checkDiscountEligibility(
  discount: Discount,
  cart: CartItem[],
  customer: Customer | null,
  paymentMethod: string,
  total: number,
  cardDetails?: { cardType?: string; bankName?: string }
): boolean {
  if (!discount.active) return false;

  const now = new Date();
  if (now < discount.validFrom || now > discount.validTo) return false;

  if (discount.validDays && discount.validDays.length > 0) {
    const currentDay = now.getDay();
    if (!discount.validDays.includes(currentDay)) return false;
  }

  for (const condition of discount.conditions) {
    if (!checkCondition(condition, cart, customer, paymentMethod, total, cardDetails)) {
      return false;
    }
  }

  return true;
}

function checkCondition(
  condition: DiscountCondition,
  cart: CartItem[],
  customer: Customer | null,
  paymentMethod: string,
  total: number,
  cardDetails?: { cardType?: string; bankName?: string }
): boolean {
  switch (condition.type) {
    case 'min_amount':
      return total >= condition.value;

    case 'specific_products':
      if (!Array.isArray(condition.value)) return false;
      for (const productId of condition.value) {
        const cartItem = cart.find((item) => item.product.id === productId);
        if (!cartItem || cartItem.quantity < (condition.minQuantity || 1)) {
          return false;
        }
      }
      return true;

    case 'payment_method':
      return paymentMethod === condition.value;

    case 'customer_tier':
      return customer?.priceTier === condition.value;

    case 'card_type':
      return paymentMethod === 'card' && cardDetails?.cardType === condition.value;

    case 'bank_name':
      return paymentMethod === 'card' && cardDetails?.bankName === condition.value;

    default:
      return true;
  }
}
