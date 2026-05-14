import { getUserId } from './apiClient';

const CART_PREFIX = 'project1_cart_';

// Key riêng theo userId — guest dùng 'guest'
function cartKey() {
  const uid = getUserId();
  return `${CART_PREFIX}${uid || 'guest'}`;
}

function readCart() {
  return JSON.parse(localStorage.getItem(cartKey()) || '[]');
}

function writeCart(items) {
  localStorage.setItem(cartKey(), JSON.stringify(items));
  window.dispatchEvent(new Event('cart-updated'));
  return items;
}

export function getCartCount() {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

export const cartService = {
  getCart() {
    return Promise.resolve(readCart());
  },

  addItem(product, quantity = 1) {
    const items = readCart();
    const existing = items.find((item) => item.product_id === product.id);

    if (existing) {
      existing.quantity += quantity;
      return Promise.resolve(writeCart(items));
    }

    return Promise.resolve(
      writeCart([
        ...items,
        {
          product_id: product.id,
          product_name: product.name,
          image_url: product.image_url,
          unit_price: product.price,
          quantity,
        },
      ]),
    );
  },

  updateQuantity(productId, quantity) {
    const nextItems = readCart().map((item) =>
      item.product_id === productId ? { ...item, quantity } : item,
    );
    return Promise.resolve(writeCart(nextItems.filter((item) => item.quantity > 0)));
  },

  removeItem(productId) {
    return Promise.resolve(writeCart(readCart().filter((item) => item.product_id !== productId)));
  },

  clearCart() {
    return Promise.resolve(writeCart([]));
  },
};
