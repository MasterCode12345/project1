const CART_STORAGE_KEY = 'project1_cart_items';

function readCart() {
  return JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
}

function writeCart(items) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  return items;
}

export const cartService = {
  getCart() {
    // TODO: Backend router hiện chưa có /api/v1/cart, tạm dùng localStorage.
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
