"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFormStore, Question } from "@/store/useFormStore";
import { api } from "@/lib/api";
import { 
  Eye, Plus, ChevronLeft, AlignLeft, Trash2, GripVertical, 
  Type, Mail, ListChecks, Hash, ToggleLeft, Star, ArrowRight, X, Sparkles, ChevronDown, Copy, Check
} from "lucide-react";

import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ==========================================
// SORTABLE ITEM COMPONENT
// ==========================================
function SortableQuestionItem({ question, index, isActive, onClick }: { question: Question; index: number; isActive: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 };

  return (
    <div
      ref={setNodeRef} style={style}
      className={`group flex items-center p-3 mb-3 rounded-xl text-sm transition-all duration-300 cursor-pointer ${
        isActive 
          ? 'bg-white border border-indigo-200 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.15)] text-indigo-950 ring-1 ring-indigo-500/10' 
          : 'bg-white/50 border border-slate-200/60 hover:bg-white hover:border-slate-300 hover:shadow-md text-slate-600'
      } ${isDragging ? 'shadow-xl opacity-90 border-indigo-300 scale-[1.02] rotate-1' : ''}`}
      onClick={onClick}
    >
      <div {...attributes} {...listeners} className="cursor-grab mr-3 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity p-1">
        <GripVertical size={16} />
      </div>
      <div className="flex flex-1 items-center gap-3 overflow-hidden">
        <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold transition-colors ${
          isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
        }`}>
          {index + 1}
        </span>
        <span className={`truncate font-medium transition-colors ${isActive ? 'text-indigo-950' : 'group-hover:text-slate-900'}`}>
          {question.title === "..." ? "New Question" : question.title}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  
  const formId = typeof params?.id === "string" 
    ? params.id 
    : Array.isArray(params?.id) 
    ? params.id[0] 
    : "";
  
  const { form, setForm, isLoading, activeQuestionId, setActiveQuestion, addQuestion, updateQuestion, deleteQuestion, reorderQuestions } = useFormStore();
  
  const [isAdding, setIsAdding] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!formId) return;
    const fetchForm = async () => {
      try {
        const response = await api.get(`/forms/${formId}`);
        setForm(response.data);
        if (response.data.questions.length > 0 && !activeQuestionId) {
          setActiveQuestion(response.data.questions[0].id);
        }
      } catch (error) {
        router.push("/");
      }
    };
    fetchForm();
  }, [formId, setForm, setActiveQuestion, router]);

  const handleAddQuestion = async (selectedType: string) => {
    if (!form) return;
    setIsAdding(true);
    try {
      const needsChoices = selectedType === 'multiple_choice' || selectedType === 'dropdown';
      const payload = { 
        type: selectedType, 
        title: "...", 
        required: false, 
        order_index: form.questions.length, 
        settings: needsChoices ? { choices: ["Option 1", "Option 2"] } : {} 
      };
      const response = await api.post(`/forms/${formId}/questions/`, payload);
      addQuestion(response.data);
      setActiveQuestion(response.data.id);
      setShowTypeModal(false);
    } finally { setIsAdding(false); }
  };

  const handleUpdateQuestion = async (id: string, updates: Partial<Question>) => {
    updateQuestion(id, updates);
    try { await api.put(`/questions/${id}`, updates); } catch (e) {}
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await api.delete(`/questions/${id}`);
      deleteQuestion(id);
    } catch (e) {}
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !form || active.id === over.id) return;
    const oldIndex = form.questions.findIndex((q) => q.id === active.id);
    const newIndex = form.questions.findIndex((q) => q.id === over.id);
    const newQuestions = arrayMove(form.questions, oldIndex, newIndex);
    reorderQuestions(newQuestions);
    try { await api.put(`/forms/${formId}/questions/reorder`, newQuestions.map(q => q.id)); } catch (e) {}
  };

  const handleTogglePublish = async () => {
    if (!form) return;
    const newStatus = form.status === "published" ? "draft" : "published";
    try {
      const res = await api.put(`/forms/${formId}`, { status: newStatus });
      setForm(res.data);
    } catch (error) {
      console.error("Failed to update publication status", error);
    }
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/form/${formId}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading || !form) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-slate-400 animate-pulse">
        <Sparkles size={32} className="text-indigo-400" />
        <p className="text-sm font-medium uppercase tracking-widest">Loading Workspace</p>
      </div>
    </div>
  );

  const activeQuestion = form.questions.find(q => q.id === activeQuestionId);
  const activeIndex = form.questions.findIndex(q => q.id === activeQuestionId);

  const questionTypes = [
    { id: 'short_text', label: 'Short Text', icon: <Type size={20} /> },
    { id: 'long_text', label: 'Long Text', icon: <AlignLeft size={20} /> },
    { id: 'multiple_choice', label: 'Multiple Choice', icon: <ListChecks size={20} /> },
    { id: 'dropdown', label: 'Dropdown', icon: <ChevronDown size={20} /> },
    { id: 'email', label: 'Email', icon: <Mail size={20} /> },
    { id: 'number', label: 'Number', icon: <Hash size={20} /> },
    { id: 'yes_no', label: 'Yes / No', icon: <ToggleLeft size={20} /> },
    { id: 'rating', label: 'Rating', icon: <Star size={20} /> },
  ];

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* ================= HEADER ================= */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-6 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-slate-800 text-lg tracking-tight">{form.title}</span>
        </div>
        <nav className="hidden md:flex items-center gap-2 p-1 bg-slate-100/80 rounded-full border border-slate-200/50">
          <span className="px-5 py-1.5 text-sm font-medium bg-white text-indigo-950 rounded-full shadow-sm cursor-default">Create</span>
          <span className="px-5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 cursor-pointer transition-colors">Connect</span>
          <span className="px-5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 cursor-pointer transition-colors" onClick={() => router.push(`/results/${formId}`)}>Results</span>
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={() => window.open(`/form/${formId}`, '_blank')} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all">
            <Eye size={16} /> Preview
          </button>
          
          {/* Share Link Button (Enabled only when published) */}
          <button 
            onClick={handleCopyLink}
            disabled={form.status !== "published"}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              form.status === "published" 
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
            }`}
            title={form.status === "published" ? "Copy public form link" : "Publish form first to share link"}
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            {copied ? "Copied!" : "Share"}
          </button>

          {/* Publish / Unpublish Toggle */}
          <button 
            onClick={handleTogglePublish}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all shadow-sm ${
              form.status === "published"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
            }`}
          >
            {form.status === "published" ? "Published ✓" : "Publish Form"}
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        
        {/* ================= LEFT SIDEBAR ================= */}
        <aside className="w-[300px] shrink-0 border-r border-slate-200/60 bg-slate-50/50 flex flex-col z-10 relative">
          <div className="p-5">
            <button 
              onClick={() => setShowTypeModal(true)} 
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] transition-all transform active:scale-95"
            >
              <Plus size={18} /> Add new question
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <div className="mb-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Form Pages</div>
            {form.questions.length === 0 ? (
              <div className="p-8 mt-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                <Sparkles size={24} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Your form is empty.</p>
                <p className="text-xs text-slate-400 mt-1">Add a question to start building.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={form.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                  {form.questions.map((q, idx) => (
                    <SortableQuestionItem key={q.id} question={q} index={idx} isActive={activeQuestionId === q.id} onClick={() => setActiveQuestion(q.id)} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </aside>

        {/* ================= CENTER CANVAS ================= */}
        <section className="flex-1 overflow-y-auto flex flex-col items-center p-6 lg:p-10 relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-overlay"></div>
          
          <div className="w-full max-w-4xl bg-white min-h-[550px] rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-12 lg:p-16 mt-4 transition-all flex flex-col justify-center relative overflow-hidden group">
            
            {activeQuestion ? (
              <div className="flex items-start gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-3xl mx-auto">
                <div className="flex flex-col items-center gap-2 pt-2 flex-shrink-0 relative">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-sm border border-indigo-100/50">
                    {activeIndex + 1}
                  </div>
                  {activeQuestion.required && (
                    <div className="absolute -top-1 -right-2 text-rose-500 text-2xl font-bold">*</div>
                  )}
                  <ArrowRight size={20} className="text-indigo-300 mt-1" />
                </div>
                
                <div className="w-full">
                  <textarea
                    value={activeQuestion.title === "..." ? "" : activeQuestion.title}
                    onChange={(e) => updateQuestion(activeQuestion.id, { title: e.target.value })}
                    onBlur={(e) => handleUpdateQuestion(activeQuestion.id, { title: e.target.value || "..." })}
                    placeholder="Type your question here..."
                    className="w-full bg-transparent text-4xl lg:text-5xl font-medium tracking-tight text-slate-900 leading-[1.15] focus:outline-none resize-none placeholder-slate-300 border-b border-transparent focus:border-indigo-100 transition-colors pb-2 mb-4"
                    rows={2}
                  />
                  
                  <textarea
                    value={activeQuestion.description || ""}
                    onChange={(e) => updateQuestion(activeQuestion.id, { description: e.target.value })}
                    onBlur={(e) => handleUpdateQuestion(activeQuestion.id, { description: e.target.value })}
                    placeholder="Add a description (optional)..."
                    className="w-full bg-transparent text-xl text-slate-500 leading-relaxed font-light focus:outline-none resize-none placeholder-slate-300 border-b border-transparent focus:border-indigo-100 transition-colors pb-2 mb-6"
                    rows={2}
                  />
                  
                  <div className="mt-6 pointer-events-none opacity-80">
                    {(activeQuestion.type === 'short_text' || activeQuestion.type === 'email' || activeQuestion.type === 'number') && (
                      <input disabled placeholder={activeQuestion.type === 'email' ? "name@example.com" : activeQuestion.type === 'number' ? "0" : "Type your answer here..."} className="w-full text-2xl pb-4 bg-transparent border-b-2 border-slate-200 focus:outline-none placeholder-slate-300 text-slate-800 font-light" />
                    )}

                    {activeQuestion.type === 'long_text' && (
                      <textarea disabled placeholder="Type your answer here..." rows={3} className="w-full text-2xl pb-4 bg-transparent border-b-2 border-slate-200 focus:outline-none placeholder-slate-300 text-slate-800 font-light resize-none" />
                    )}
                    
                    {(activeQuestion.type === 'multiple_choice' || activeQuestion.type === 'dropdown') && (
                      <div className="space-y-4">
                        {(activeQuestion.settings?.choices || ["Option 1"]).map((choice: string, i: number) => (
                          <div key={i} className="relative border border-slate-200 rounded-2xl p-4 text-slate-700 bg-white flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-sm font-semibold text-slate-500">
                              {String.fromCharCode(65 + i)}
                            </div>
                            <span className="text-lg font-medium">{choice || "Empty option"}</span>
                            {activeQuestion.type === 'dropdown' && i === 0 && <ChevronDown className="absolute right-6 text-slate-400" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {activeQuestion.type === 'yes_no' && (
                      <div className="flex gap-4">
                        <div className="flex-1 border border-slate-200 rounded-2xl p-6 text-center bg-white shadow-sm flex items-center justify-center gap-3">
                          <span className="px-2 py-1 bg-slate-100 rounded text-sm font-bold text-slate-500">Y</span>
                          <span className="text-xl font-medium text-slate-700">Yes</span>
                        </div>
                        <div className="flex-1 border border-slate-200 rounded-2xl p-6 text-center bg-white shadow-sm flex items-center justify-center gap-3">
                          <span className="px-2 py-1 bg-slate-100 rounded text-sm font-bold text-slate-500">N</span>
                          <span className="text-xl font-medium text-slate-700">No</span>
                        </div>
                      </div>
                    )}

                    {activeQuestion.type === 'rating' && (
                      <div className="flex gap-4 items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} size={44} className="text-slate-300" strokeWidth={1.5} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                  <Plus size={32} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-medium text-slate-600 mb-2">Canvas is empty</h3>
                <p className="text-slate-400">Select or add a question from the sidebar to start designing.</p>
              </div>
            )}
          </div>
        </section>

        {/* ================= RIGHT SIDEBAR ================= */}
        <aside className="w-[340px] shrink-0 border-l border-slate-200/60 bg-white flex flex-col z-10 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)]">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-lg">Properties</h3>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            {activeQuestion ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Question Type</label>
                  <select 
                    value={activeQuestion.type} 
                    onChange={(e) => handleUpdateQuestion(activeQuestion.id, { type: e.target.value })} 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer appearance-none"
                  >
                    {questionTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>

                {(activeQuestion.type === 'multiple_choice' || activeQuestion.type === 'dropdown') && (
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Choices</label>
                    <div className="space-y-2">
                      {(activeQuestion.settings?.choices || ["Option 1"]).map((choice: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={choice}
                            onChange={(e) => {
                              const newChoices = [...(activeQuestion.settings?.choices || [])];
                              newChoices[idx] = e.target.value;
                              updateQuestion(activeQuestion.id, { settings: { ...activeQuestion.settings, choices: newChoices } });
                            }}
                            onBlur={() => handleUpdateQuestion(activeQuestion.id, { settings: activeQuestion.settings })}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                          />
                          <button 
                            onClick={() => {
                              const newChoices = (activeQuestion.settings?.choices || []).filter((_: any, i: number) => i !== idx);
                              handleUpdateQuestion(activeQuestion.id, { settings: { ...activeQuestion.settings, choices: newChoices } });
                            }}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => {
                        const currentChoices = activeQuestion.settings?.choices || [];
                        const newChoices = [...currentChoices, `Option ${currentChoices.length + 1}`];
                        handleUpdateQuestion(activeQuestion.id, { settings: { ...activeQuestion.settings, choices: newChoices } });
                      }}
                      className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2 px-1"
                    >
                      <Plus size={16} /> Add choice
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <span className="text-sm font-semibold text-slate-700">Make this required</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={activeQuestion.required} onChange={(e) => handleUpdateQuestion(activeQuestion.id, { required: e.target.checked })} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                  </label>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button 
                    onClick={() => handleDeleteQuestion(activeQuestion.id)} 
                    className="flex items-center justify-center w-full gap-2 rounded-xl border border-rose-200 bg-rose-50 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 transition-all active:scale-95"
                  >
                    <Trash2 size={16} /> Delete Question
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center text-slate-400">
                <p className="text-sm">Select a question to view properties.</p>
              </div>
            )}
          </div>
        </aside>

        {/* ================= TYPE PICKER MODAL ================= */}
        {showTypeModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100">
              <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Add Content</h3>
                  <p className="text-slate-500 text-sm mt-1">Choose the type of question to add to your form.</p>
                </div>
                <button onClick={() => setShowTypeModal(false)} className="p-2 bg-white text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all border border-slate-200 shadow-sm">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white">
                {questionTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleAddQuestion(type.id)}
                    disabled={isAdding}
                    className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 transition-all group disabled:opacity-50 bg-white hover:-translate-y-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 group-hover:scale-110 transition-all mb-3">
                      {type.icon}
                    </div>
                    <span className="font-semibold text-sm text-slate-700 group-hover:text-indigo-950 transition-colors text-center">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}