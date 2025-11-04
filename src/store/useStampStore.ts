import { create } from 'zustand';
import { StampCard, Business } from '../types';
import {
  getUserStampCards,
  createStampCard as createCard,
  addStamp as addStampToCard,
  redeemCard as redeemStampCard,
  getAllBusinesses,
} from '../services/stamps';
import logger from '../utils/logger';

interface StampState {
  cards: StampCard[];
  businesses: Business[];
  isLoading: boolean;
  lastFetched: number | null;

  // Actions
  fetchCards: (userId: string) => Promise<void>;
  fetchBusinesses: () => Promise<void>;
  createCard: (userId: string, businessId: string) => Promise<{ data: StampCard | null; error: string | null }>;
  addStamp: (cardId: string, method: 'nfc' | 'qr') => Promise<{ data: StampCard | null; error: string | null; isCompleted: boolean }>;
  redeemCard: (cardId: string, userId: string) => Promise<{ error: string | null }>;
  refreshCards: (userId: string) => Promise<void>;
  clearCards: () => void;
}

export const useStampStore = create<StampState>((set, get) => ({
  cards: [],
  businesses: [],
  isLoading: false,
  lastFetched: null,

  fetchCards: async (userId: string) => {
    set({ isLoading: true });
    try {
      const cards = await getUserStampCards(userId);
      set({
        cards,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (error) {
      logger.error('Failed to fetch stamp cards', error);
      set({ isLoading: false });
    }
  },

  fetchBusinesses: async () => {
    try {
      const businesses = await getAllBusinesses();
      set({ businesses });
    } catch (error) {
      logger.error('Failed to fetch businesses', error);
    }
  },

  createCard: async (userId: string, businessId: string) => {
    const { data, error } = await createCard(userId, businessId);
    if (data) {
      // Add new card to state
      set((state) => ({
        cards: [...state.cards, data],
      }));
    }
    return { data, error };
  },

  addStamp: async (cardId: string, method: 'nfc' | 'qr') => {
    const { data, error, isCompleted } = await addStampToCard(cardId, method);
    if (data) {
      // Update card in state
      set((state) => ({
        cards: state.cards.map((card) =>
          card.id === cardId ? data : card
        ),
      }));
    }
    return { data, error, isCompleted };
  },

  redeemCard: async (cardId: string, userId: string) => {
    const { error } = await redeemStampCard(cardId, userId);
    if (!error) {
      // Remove redeemed card from state
      set((state) => ({
        cards: state.cards.filter((card) => card.id !== cardId),
      }));
    }
    return { error };
  },

  refreshCards: async (userId: string) => {
    await get().fetchCards(userId);
  },

  clearCards: () => {
    set({ cards: [], lastFetched: null });
  },
}));
