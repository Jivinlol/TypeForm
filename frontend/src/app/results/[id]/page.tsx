"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  ChevronLeft, ExternalLink, Download, Table2, 
  Calendar, Users, Sparkles, Inbox
} from "lucide-react";

interface Question { id: string; type: string; title: string; }
interface Form { id: string; title: string; questions: Question[]; }
interface Answer { id: string; question_id: string; value: any; }
interface FormResponse { id: string; form_id: string; submitted_at: string; answers: Answer[]; }

export default function ResultsDashboard() {
  const params = useParams();
  const router = useRouter();
  
  // Safely resolve formId whether it's a string, array, or undefined
  const formId = typeof params?.id === "string" 
    ? params.id 
    : Array.isArray(params?.id) 
    ? params.id[0] 
    : "";
  
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!formId) return; // Prevent requests if formId isn't loaded yet

    const fetchResultsData = async () => {
      try {
        const [formRes, responsesRes] = await Promise.all([
          api.get(`/forms/${formId}`),
          api.get(`/forms/${formId}/responses/`)
        ]);
        setForm(formRes.data);
        setResponses(responsesRes.data);
      } catch (error) {
        console.error("Failed to load results data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResultsData();
  }, [formId]);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "-";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  // ==========================================
  // IST TIME FORMATTER (Asia/Kolkata)
  // ==========================================
  const formatToIST = (dateString: string, includeTime: boolean = true) => {
    if (!dateString) return "-";
    // Append 'Z' to ensure JS knows the backend time is UTC
    const safeDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    const options: Intl.DateTimeFormatOptions = { 
      timeZone: 'Asia/Kolkata', 
      month: 'short', day: 'numeric', year: 'numeric'
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = true;
    }
    return new Date(safeDateString).toLocaleString('en-IN', options);
  };

  const exportToCSV = () => {
    if (!form || responses.length === 0) return;
    const headers = ["Submitted At (IST)", ...form.questions.map(q => q.title)];
    const rows = responses.map(response => {
      const date = formatToIST(response.submitted_at, true);
      const rowData = [date];
      form.questions.forEach(q => {
        const answer = response.answers.find(a => a.question_id === q.id);
        const formattedAnswer = formatValue(answer?.value).replace(/"/g, '""');
        rowData.push(`"${formattedAnswer}"`);
      });
      return rowData.join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${form.title.replace(/\s+/g, '_')}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-slate-400 animate-pulse">
        <Sparkles size={32} className="text-indigo-400" />
        <p className="text-sm font-medium uppercase tracking-widest">Loading Data</p>
      </div>
    </div>
  );

  if (!form) return <div className="flex h-screen items-center justify-center">Form not found.</div>;

  const totalResponses = responses.length;
  // Properly parse UTC for the Max calculation, then format to IST
  const latestSubmission = totalResponses > 0 
    ? formatToIST(new Date(Math.max(...responses.map(r => new Date(r.submitted_at.endsWith('Z') ? r.submitted_at : r.submitted_at + 'Z').getTime()))).toISOString())
    : "N/A";

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-6 z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-slate-800 text-lg tracking-tight">{form.title}</span>
        </div>
        <nav className="hidden md:flex items-center gap-2 p-1 bg-slate-100/80 rounded-full border border-slate-200/50">
          <span onClick={() => router.push(`/builder/${formId}`)} className="px-5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 cursor-pointer transition-colors">Create</span>
          <span className="px-5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 cursor-pointer transition-colors">Connect</span>
          <span className="px-5 py-1.5 text-sm font-medium bg-white text-indigo-950 rounded-full shadow-sm cursor-default">Results</span>
        </nav>
        <div className="flex items-center gap-4">
          <button onClick={() => window.open(`/form/${formId}`, '_blank')} className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all">
            <ExternalLink size={16} /> View Form
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto space-y-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Results</h1>
              <p className="text-slate-500 mt-1">View and analyze your collected data.</p>
            </div>
            <button onClick={exportToCSV} disabled={totalResponses === 0} className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95">
              <Download size={16} className="text-indigo-600" /> Export to CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-start gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={24} /></div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Responses</p>
                <h3 className="text-3xl font-bold text-slate-900">{totalResponses}</h3>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-start gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Calendar size={24} /></div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Latest Submission</p>
                <h3 className="text-xl font-bold text-slate-900 mt-2">{latestSubmission}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <Table2 size={20} className="text-slate-400" />
              <h3 className="font-semibold text-slate-800 text-lg">Response Data</h3>
            </div>
            
            {totalResponses === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6"><Inbox size={32} className="text-slate-300" /></div>
                <h4 className="text-xl font-medium text-slate-900 mb-2">No responses yet</h4>
                <p className="text-slate-500 max-w-sm">Share your form link to start collecting data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100 tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Submitted At</th>
                      {form.questions.map((q) => (
                        <th key={q.id} className="px-6 py-4 font-semibold max-w-[250px] truncate" title={q.title}>{q.title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((response) => (
                      <tr key={response.id} className="bg-white hover:bg-slate-50/80 border-b border-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-600">
                          {formatToIST(response.submitted_at, true)}
                        </td>
                        {form.questions.map((q) => {
                          const answer = response.answers.find(a => a.question_id === q.id);
                          const value = formatValue(answer?.value);
                          return (
                            <td key={q.id} className="px-6 py-4 text-slate-700">
                              <div className="max-w-[300px] truncate" title={value}>{value}</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}