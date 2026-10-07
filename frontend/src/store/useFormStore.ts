import { create } from 'zustand';

// Types mapped from our backend schemas
export interface Question {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  order_index: number;
  settings: Record<string, any>;
}

export interface Form {
  id: string;
  title: string;
  status: string;
  questions: Question[];
}

interface FormState {
  form: Form | null;
  activeQuestionId: string | null;
  isLoading: boolean;
  
  // Actions
  setForm: (form: Form) => void;
  setActiveQuestion: (id: string | null) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  reorderQuestions: (reorderedQuestions: Question[]) => void;
}

export const useFormStore = create<FormState>((set) => ({
  form: null,
  activeQuestionId: null,
  isLoading: true,

  setForm: (form) => set({ form, isLoading: false }),
  
  setActiveQuestion: (id) => set({ activeQuestionId: id }),
  
  addQuestion: (question) => set((state) => ({
    form: state.form ? {
      ...state.form,
      questions: [...state.form.questions, question]
    } : null,
    activeQuestionId: question.id // Auto-select newly added question
  })),

  updateQuestion: (id, updates) => set((state) => ({
    form: state.form ? {
      ...state.form,
      questions: state.form.questions.map((q) => 
        q.id === id ? { ...q, ...updates } : q
      )
    } : null
  })),

  deleteQuestion: (id) => set((state) => {
    if (!state.form) return state;
    const remaining = state.form.questions.filter((q) => q.id !== id);
    return {
      form: { ...state.form, questions: remaining },
      // If we delete the active question, clear the selection
      activeQuestionId: state.activeQuestionId === id ? null : state.activeQuestionId
    };
  }),

  reorderQuestions: (reorderedQuestions) => set((state) => ({
    form: state.form ? {
      ...state.form,
      questions: reorderedQuestions
    } : null
  }))
}));