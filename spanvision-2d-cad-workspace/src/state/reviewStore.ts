import { create } from 'zustand';
import type { MarkupStroke } from '../services/web/draftStorage';

interface ReviewState {
  byDocument: Record<string, Record<string, MarkupStroke[]>>;
  setStrokes: (documentId: string, drawingId: string, strokes: MarkupStroke[]) => void;
  hydrate: (documentId: string, markups: Record<string, MarkupStroke[]>) => void;
}
export const useReviewStore = create<ReviewState>(set => ({
  byDocument: {},
  setStrokes: (documentId, drawingId, strokes) => set(state => ({
    byDocument: { ...state.byDocument, [documentId]: { ...state.byDocument[documentId], [drawingId]: strokes } },
  })),
  hydrate: (documentId, markups) => set(state => ({ byDocument: { ...state.byDocument, [documentId]: markups } })),
}));
