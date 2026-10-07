"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ExternalLink, LogOut, Sparkles, Layers, BarChart3, Copy, Check } from "lucide-react";
import { api } from "../lib/api";
import { useRouter } from "next/navigation";

interface Form {
  id: string;
  title: string;
  description?: string;
  status: string;
  updated_at: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
}

export default function Dashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [userRes, formsRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/forms/")
        ]);
        setUser(userRes.data);
        setForms(formsRes.data);
      } catch (error) {
        console.error("Authentication or fetch failed:", error);
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const handleCreateForm = async () => {
    setCreating(true);
    try {
      const response = await api.post("/forms/", {
        title: "New form",
        description: "",
        status: "draft"
      });
      router.push(`/builder/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create form:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteForm = async (e: React.MouseEvent, formId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this form?")) return;

    try {
      await api.delete(`/forms/${formId}`);
      setForms(forms.filter(f => f.id !== formId));
    } catch (error) {
      console.error("Failed to delete form:", error);
    }
  };

  const handleCopyPublicLink = (e: React.MouseEvent, formId: string, status: string) => {
    e.stopPropagation();
    if (status !== "published") {
      alert("Please publish this form first before sharing the link.");
      return;
    }
    const publicUrl = `${window.location.origin}/form/${formId}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedFormId(formId);
    setTimeout(() => setCopiedFormId(null), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400 font-medium animate-pulse">
        Loading your workspace...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20">
            <Sparkles size={16} />
          </div>
          <span className="font-bold text-slate-800 text-lg tracking-tight">Typeflow Workspace</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-500 hidden sm:inline">{user?.email}</span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Forms</h1>
              <p className="text-slate-500 mt-1">Manage and track your questionnaires.</p>
            </div>
            <button 
              onClick={handleCreateForm}
              disabled={creating}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all font-semibold text-sm disabled:opacity-50"
            >
              <Plus size={18} /> {creating ? "Creating..." : "Create new form"}
            </button>
          </div>

          {forms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Layers size={28} />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-1">No forms yet</h3>
              <p className="text-slate-500 text-sm mb-6">Create one to get started with your data collection!</p>
              <button 
                onClick={handleCreateForm}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all"
              >
                Create your first form
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map((form) => (
                <div 
                  key={form.id} 
                  className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between h-52 relative"
                  onClick={() => router.push(`/builder/${form.id}`)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-slate-800 text-lg truncate group-hover:text-indigo-600 transition-colors">
                        {form.title}
                      </h3>
                      <button 
                        onClick={(e) => handleDeleteForm(e, form.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete form"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      form.status === "published" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
                    }`}>
                      {form.status}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Updated {new Date(form.updated_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => handleCopyPublicLink(e, form.id, form.status)}
                        className={`p-2 rounded-lg transition-colors ${form.status === "published" ? "hover:text-indigo-600 hover:bg-indigo-50" : "opacity-40 cursor-not-allowed"}`}
                        title={form.status === "published" ? "Copy public share link" : "Publish form to enable sharing"}
                      >
                        {copiedFormId === form.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/results/${form.id}`);
                        }}
                        className="p-2 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Results"
                      >
                        <BarChart3 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/form/${form.id}`, '_blank');
                        }}
                        className="p-2 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Preview Form"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}