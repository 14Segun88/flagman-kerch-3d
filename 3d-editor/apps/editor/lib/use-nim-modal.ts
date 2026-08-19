import { create } from 'zustand'

interface NimModalState {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

export const useNimModal = create<NimModalState>((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}))
