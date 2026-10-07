"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ArrowRight, Check, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

interface Question {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  settings?: any;
}

interface Form {
  id: string;
  title: string;
  questions: Question[];
}

export default function FormRespondentView() {
  const params = useParams();
  const formId = params.id as string;
  
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await api.get(`/forms/${formId}`);
        setForm(response.data);
      } catch (error) {
        console.error("Form not found");
      } finally {
        setLoading(false);
      }
    };
    if (formId) fetchForm();
  }, [formId]);

  const currentQuestion = form?.questions[currentIndex];
  const progressPercentage = form ? ((currentIndex) / form.questions.length) * 100 : 0;

  // ==========================================
  // VALIDATION ENGINE
  // ==========================================
  const validateCurrentQuestion = (): boolean => {
    if (!currentQuestion) return false;
    const value = answers[currentQuestion.id];
    setError(null); // Clear previous errors

    // 1. Required Check
    if (currentQuestion.required && (!value || value.toString().trim() === "")) {
      setError("Please fill in this required field.");
      return false;
    }

    // Skip format checks if empty and not required
    if (!value || value.toString().trim() === "") return true;

    // 2. Email Format Check
    if (currentQuestion.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setError("Hmm, that doesn't look like a valid email address.");
        return false;
      }
    }

    // 3. Number Validation (e.g., phone numbers or ages)
    if (currentQuestion.type === 'number') {
      if (isNaN(Number(value))) {
        setError("Please enter a valid number.");
        return false;
      }
      // Example of applying a custom setting constraint (if set in Builder)
      if (currentQuestion.settings?.maxLength && value.toString().length > currentQuestion.settings.maxLength) {
        setError(`Must be ${currentQuestion.settings.maxLength} characters or less.`);
        return false;
      }
      if (currentQuestion.settings?.minLength && value.toString().length < currentQuestion.settings.minLength) {
        setError(`Must be at least ${currentQuestion.settings.minLength} characters.`);
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!form || !currentQuestion) return;
    
    // Run validation before advancing
    if (!validateCurrentQuestion()) return;

    if (currentIndex < form.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setError(null);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && currentQuestion?.type !== 'long_text') {
      e.preventDefault();
      handleNext();
    }
  };

  // ==========================================
  // REAL API SUBMISSION
  // ==========================================
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Map dictionary into an array structure if your backend expects it, 
      // or send directly as a JSON payload. Adjust to match your FastAPI schema.
      const payload = {
        answers: Object.entries(answers).map(([question_id, value]) => ({
          question_id: question_id,
          value: value
        }))
      };

      await api.post(`/forms/${formId}/responses`, payload);
      setIsCompleted(true);
    } catch (err) {
      console.error("Failed to submit form:", err);
      setError("Failed to submit. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="animate-pulse text-indigo-400 font-medium">Loading form...</div></div>;
  if (!form || form.questions.length === 0) return <div className="flex h-screen items-center justify-center text-slate-500">This form is empty or unavailable.</div>;

  if (isCompleted) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-6 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-8 shadow-sm">
          <Check size={40} strokeWidth={3} />
        </div>
        <h1 className="text-4xl font-medium tracking-tight text-slate-900 mb-3">All done!</h1>
        <p className="text-lg text-slate-500 text-center max-w-md">Your response has been recorded. Thanks for taking the time to complete this.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white text-slate-900 font-sans overflow-hidden">
      
      <div className="h-1.5 w-full bg-slate-100">
        <div className="h-full bg-indigo-600 transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
      </div>

      <main className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div key={currentQuestion?.id} className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          <div className="flex items-start gap-4 lg:gap-6 mb-8">
            <div className="flex items-center text-indigo-600 font-bold text-xl lg:text-2xl pt-1">
              <span>{currentIndex + 1}</span>
              <ArrowRight size={20} className="ml-1" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-medium tracking-tight text-slate-900 mb-4 leading-tight">
                {currentQuestion?.title}
                {currentQuestion?.required && <span className="text-rose-500 ml-2 text-3xl align-top">*</span>}
              </h1>
              
              {currentQuestion?.description && (
                <p className="text-xl text-slate-500 mb-10 font-light leading-relaxed">
                  {currentQuestion.description}
                </p>
              )}
              
              <div className="mt-8 relative" onKeyDown={handleKeyDown}>
                
                {(currentQuestion?.type === 'short_text' || currentQuestion?.type === 'email' || currentQuestion?.type === 'number') && (
                  <input 
                    type={currentQuestion.type === 'number' ? 'tel' : currentQuestion.type === 'email' ? 'email' : 'text'}
                    autoFocus
                    placeholder="Type your answer here..."
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => {
                      setAnswers({ ...answers, [currentQuestion.id]: e.target.value });
                      setError(null);
                    }}
                    className={`w-full text-3xl pb-4 bg-transparent border-b-2 focus:outline-none placeholder-slate-300 text-indigo-950 font-light transition-colors ${
                      error ? 'border-rose-500' : 'border-indigo-200 focus:border-indigo-600'
                    }`}
                  />
                )}

                {currentQuestion?.type === 'long_text' && (
                  <textarea 
                    autoFocus
                    placeholder="Type your answer here..."
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => {
                      setAnswers({ ...answers, [currentQuestion.id]: e.target.value });
                      setError(null);
                      // Auto-resize logic
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                    }}
                    rows={2}
                    className={`w-full text-2xl pb-4 bg-transparent border-b-2 focus:outline-none placeholder-slate-300 text-indigo-950 font-light transition-colors resize-none ${
                      error ? 'border-rose-500' : 'border-indigo-200 focus:border-indigo-600'
                    }`}
                  />
                )}

                {(currentQuestion?.type === 'multiple_choice' || currentQuestion?.type === 'dropdown') && (
                  <div className="space-y-3">
                    {(currentQuestion.settings?.choices || []).map((choice: string, i: number) => {
                      const isSelected = answers[currentQuestion.id] === choice;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setAnswers({ ...answers, [currentQuestion.id]: choice });
                            setError(null);
                            setTimeout(handleNext, 400); // Auto-advance feeling smooth
                          }}
                          className={`w-full text-left relative border rounded-2xl p-5 text-xl transition-all flex items-center gap-5 ${
                            isSelected 
                              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm ring-1 ring-indigo-600' 
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-indigo-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-semibold transition-colors ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          <span className="font-medium">{choice}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion?.type === 'yes_no' && (
                  <div className="flex gap-4">
                    {['Yes', 'No'].map((opt) => (
                      <button 
                        key={opt}
                        onClick={() => {
                          setAnswers({ ...answers, [currentQuestion.id]: opt });
                          setError(null);
                          setTimeout(handleNext, 400);
                        }}
                        className={`flex-1 border rounded-2xl p-6 text-center shadow-sm flex items-center justify-center gap-3 transition-all ${
                          answers[currentQuestion.id] === opt 
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-300'
                        }`}
                      >
                        <span className={`px-2 py-1 rounded text-sm font-bold ${answers[currentQuestion.id] === opt ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>{opt.charAt(0)}</span>
                        <span className="text-xl font-medium">{opt}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ELEGANT ERROR DISPLAY */}
                {error && (
                  <div className="absolute -bottom-10 left-0 flex items-center gap-2 text-rose-500 text-sm font-medium animate-in slide-in-from-top-2 duration-300">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

              </div>

              <div className="mt-14 flex items-center gap-6">
                <button 
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : currentIndex === form.questions.length - 1 ? 'Submit' : 'OK'} 
                  {!isSubmitting && <Check size={20} />}
                </button>
                {currentQuestion?.type !== 'multiple_choice' && currentQuestion?.type !== 'yes_no' && (
                  <span className="text-sm text-slate-400 font-medium">press <strong className="text-slate-700">Enter ↵</strong></span>
                )}
              </div>

            </div>
          </div>
          
        </div>
      </main>

      <footer className="h-20 shrink-0 flex items-center justify-end px-8 z-10 relative">
        <div className="flex bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.1)] rounded-xl overflow-hidden border border-slate-200">
          <button onClick={handlePrevious} disabled={currentIndex === 0} className="p-3 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors border-r border-slate-200">
            <ChevronUp size={24} />
          </button>
          <button onClick={handleNext} className="p-3 text-slate-600 hover:bg-slate-100 transition-colors">
            <ChevronDown size={24} />
          </button>
        </div>
      </footer>
    </div>
  );
}