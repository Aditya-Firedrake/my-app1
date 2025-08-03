import { create } from 'zustand';
import { cartAPI } from '../services/api';
import toast from 'react-hot-toast';

const useCartStore = create((set, get) => ({
  cartItems: [],
  loading: false,
  error: null,

  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      const response = await cartAPI.getCart();
      if (response.success) {
        set({ cartItems: response.data.items || [], loading: false });
      } else {
        set({ error: response.message, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  addToCart: async (productId, quantity = 1) => {
    set({ loading: true, error: null });
    try {
      const response = await cartAPI.addToCart({ productId, quantity });
      if (response.success) {
        await get().fetchCart();
        toast.success('Item added to cart successfully');
      } else {
        set({ error: response.message, loading: false });
        toast.error(response.message);
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      toast.error(error.message);
    }
  },

  updateCartItem: async (itemId, quantity) => {
    set({ loading: true, error: null });
    try {
      const response = await cartAPI.updateCartItem(itemId, quantity);
      if (response.success) {
        await get().fetchCart();
        toast.success('Cart updated successfully');
      } else {
        set({ error: response.message, loading: false });
        toast.error(response.message);
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      toast.error(error.message);
    }
  },

  removeFromCart: async (itemId) => {
    set({ loading: true, error: null });
    try {
      const response = await cartAPI.removeFromCart(itemId);
      if (response.success) {
        await get().fetchCart();
        toast.success('Item removed from cart');
      } else {
        set({ error: response.message, loading: false });
        toast.error(response.message);
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      toast.error(error.message);
    }
  },

  clearCart: async () => {
    set({ loading: true, error: null });
    try {
      const response = await cartAPI.clearCart();
      if (response.success) {
        set({ cartItems: [], loading: false });
        toast.success('Cart cleared successfully');
      } else {
        set({ error: response.message, loading: false });
        toast.error(response.message);
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      toast.error(error.message);
    }
  },

  getCartTotal: () => {
    const { cartItems } = get();
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  },

  getCartItemCount: () => {
    const { cartItems } = get();
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }
}));

export const useCart = () => useCartStore(); 