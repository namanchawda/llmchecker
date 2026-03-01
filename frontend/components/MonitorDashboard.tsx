"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getJobs,
  getJobRuns,
  getJobStatus,
  getJobIncidents,
} from "../lib/api";
import { enableJob, disableJob } from "../app/api/monitor";
import CreateJobForm from "../components/CreateJobForm";
import { JobList } from "../components/JobList";
import { JobDetails } from "../components/JobDetails";
import { useAuth } from "../app/context/AuthContext";
import { MonitorSidebar } from "../components/monitor/MonitorSidebar";
import { CustomStatusSummary } from "../components/CustomStatusSummary";
import { PaginatedIncidentTable } from "../components/PaginatedIncidentTable";
import { Search, SlidersHorizontal, ChevronDown, Plus, X, ArrowLeft, AlertTriangle } from "lucide-react";

type ViewMode = "ALL" | "ERRORS";
import IntegrationsPage from "../components/IntegrationsPage";

type Tab = "MONITORING" | "INCIDENTS" | "INTEGRATIONS";
type CenterView = "LIST" | "DETAIL";

/* ─── FormModal ──────────────────────────────────────────────────────────────
   Centered dialog modal. Locks background scroll while open.
────────────────────────────────────────────────────────────────────────── */
function FormModal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      {/* Full-screen backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      {/* Centered dialog — clicking inside does not close */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg mx-4 bg-[#141720] border border-slate-700/60 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] max-h-[calc(100vh-80px)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}


export default function MonitorPage({ onBack }: { onBack?: () => void }) {
  const { token } = useAuth();

  const [tab, setTab] = useState<Tab>("MONITORING");
  const [centerView, setCenterView] = useState<CenterView>("LIST");
  const [showForm, setShowForm] = useState(false);

  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [editingJob, setEditingJob] = useState<any | null>(null);

  const [runs, setRuns] = useState<any[]>([]);
  const [status, setStatus] = useState<any | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);

  // enriched: incidents with jobPrompt attached for the Incidents tab
  const [allIncidentsEnriched, setAllIncidentsEnriched] = useState<any[]>([]);
  const [allIncidentsByJob, setAllIncidentsByJob] = useState<Record<string, any[]>>({});

  const [viewMode, setViewMode] = useState<ViewMode>("ALL");
  const [search, setSearch] = useState("");

  /* ── loaders ── */

  async function loadJobs() {
    const data = await getJobs();
    const list: any[] = Array.isArray(data) ? data : data.jobs ?? [];
    setJobs(list);

    const arrays = await Promise.all(list.map((j: any) => getJobIncidents(j.id)));

    // per-job map for sparklines
    const byJob: Record<string, any[]> = {};
    list.forEach((j: any, i: number) => { byJob[j.id] = arrays[i] ?? []; });
    setAllIncidentsByJob(byJob);

    // enriched flat list with jobPrompt for Incidents tab
    const enriched = arrays.flatMap((incArr, i) =>
      (incArr ?? []).map((inc: any) => ({
        ...inc,
        jobPrompt: list[i]?.prompt ?? null,
      }))
    );
    setAllIncidentsEnriched(enriched);
  }

  async function loadAll(jobId: string) {
    try {
      const [runsData, statusData, incData] = await Promise.all([
        getJobRuns(jobId),
        getJobStatus(jobId),
        getJobIncidents(jobId),
      ]);
      setRuns(Array.isArray(runsData) ? runsData : []);
      setStatus(statusData ?? null);
      setIncidents(Array.isArray(incData) ? incData : []);
    } catch {
      setRuns([]); setStatus(null); setIncidents([]);
    }
  }

  /* ── init & polling ── */

  /* ── init & polling ── */

useEffect(() => {
  if (!token) {
    setJobs([]); 
    setSelectedJob(null); 
    setRuns([]);
    setStatus(null); 
    setIncidents([]); 
    setAllIncidentsEnriched([]);
    return;
  }

  loadJobs();
}, [token]);

// 🔴 GLOBAL POLLING — refresh everything like UptimeRobot
useEffect(() => {
  if (!token) return;

  const interval = setInterval(async () => {
    await loadJobs();                 // refresh monitors + incidents list

    if (selectedJob) {
      loadAll(selectedJob.id);        // refresh open monitor details
    }
  }, 5000); // 5s

  return () => clearInterval(interval);
}, [token, selectedJob]);

useEffect(() => {
  if (!selectedJob) return;
  loadAll(selectedJob.id);
}, [selectedJob]);

  /* ── handlers ── */

  function handleSelect(jobId: string) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setSelectedJob(job);
    setViewMode("ALL");
    setCenterView("DETAIL");
    setShowForm(false);
  }

  function handleShowErrors(jobId: string) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setSelectedJob(job);
    setViewMode("ERRORS");
    setCenterView("DETAIL");
    setShowForm(false);
  }

  function handleEdit(job: any) {
    setEditingJob(job);
    setShowForm(true);
  }

  function handleNew() {
    setEditingJob(null);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingJob(null);
  }

  function handleBackToList() {
    setCenterView("LIST");
    setSelectedJob(null);
    setRuns([]); setStatus(null); setIncidents([]);
  }

  function handleDeleted(deletedId: string) {
    loadJobs();
    if (selectedJob?.id === deletedId) handleBackToList();
    if (editingJob?.id === deletedId) handleCloseForm();
  }

  async function handleToggle(job: any) {
    try {
      job.isActive ? await disableJob(job.id) : await enableJob(job.id);
      await loadJobs();
      setSelectedJob((prev: any) =>
        prev?.id === job.id ? { ...prev, isActive: !job.isActive } : prev
      );
    } catch (e) {
      console.error(e);
    }
  }

  /* ── derived ── */

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    return jobs.filter((j) =>
      j.prompt.toLowerCase().includes(search.toLowerCase())
    );
  }, [jobs, search]);

  const activeCount = jobs.filter((j) => j.isActive).length;
  const allIncidents = useMemo(
    () => Object.values(allIncidentsByJob).flat(),
    [allIncidentsByJob]
  );

  /* ── incident tab stats ── */
  const incidentStats = useMemo(() => {
    const total = allIncidentsEnriched.length;
    const ongoing = allIncidentsEnriched.filter((i) => !i.resolvedAt).length;
    const resolved = total - ongoing;
    return { total, ongoing, resolved };
  }, [allIncidentsEnriched]);

  /* ── render ── */

  return (<>
    {/* Back */}
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
    <div className="flex h-[calc(100vh-60px)]  overflow-hidden     rounded-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <MonitorSidebar active={tab} onChange={(t) => { setTab(t); setCenterView("LIST"); }} />

      <div className="flex flex-1 min-w-0 overflow-hidden">

        {/* ── MONITORING TAB ── */}
        {tab === "MONITORING" && (
          <>
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

              {/* LIST */}
              {centerView === "LIST" && (
                <>
                  <div className="px-7 pt-7 pb-4 shrink-0">
                    <div className="flex items-center justify-between">
                      <h1 className="text-2xl font-bold text-white">
                        Monitors<span className="text-slate-500">.</span>
                      </h1>
                      <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        New
                        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-5">
                      <div className="text-xs text-slate-500 bg-slate-800/60 border border-slate-700/50 px-3 py-2 rounded-xl whitespace-nowrap">
                        <span className="text-white font-medium">{activeCount}</span>
                        <span className="mx-1">/</span>
                        <span>{jobs.length}</span>
                      </div>
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search by name or prompt"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
                        />
                      </div>
                      <button className="flex items-center gap-1.5 text-xs text-slate-400 border border-slate-700/50 bg-slate-800/60 px-3 py-2 rounded-xl hover:text-white transition-colors">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Filter
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="mx-7 mb-7 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/20">
                      <JobList
                        jobs={filteredJobs}
                        selectedId={null}
                        onSelect={handleSelect}
                        onShowErrors={handleShowErrors}
                        onJobUpdated={loadJobs}
                        onEdit={handleEdit}
                        onDeleted={handleDeleted}
                        allIncidents={allIncidentsByJob}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* DETAIL */}
              {centerView === "DETAIL" && selectedJob && (
                <div className="flex-1 overflow-y-auto">
                  <div className="px-7 pt-4 shrink-0">
                    <button
                      onClick={handleBackToList}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Monitoring
                    </button>
                  </div>
                  <JobDetails
                    job={selectedJob}
                    runs={runs}
                    status={status}
                    incidents={incidents}
                    viewMode={viewMode}
                    onEdit={handleEdit}
                    onToggle={handleToggle}
                    onJobUpdated={loadJobs}
                  />
                </div>
              )}
            </div>

            {/* right status panel */}
            {centerView === "LIST" && (
              <div className="w-72 shrink-0 border-l border-slate-800/60 overflow-y-auto">
                <div className="p-4 flex flex-col gap-4">
                  <CustomStatusSummary incidents={allIncidents} jobs={jobs} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── INTEGRATIONS TAB ── */}
        {tab === "INTEGRATIONS" && <IntegrationsPage />}

        {/* ── INCIDENTS TAB ── */}
        {tab === "INCIDENTS" && (
          <div className="flex-1 overflow-y-auto px-7 py-7">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-white">
                Incidents<span className="text-slate-500">.</span>
              </h1>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-4">
                <div className="text-2xl font-bold text-white">{incidentStats.total}</div>
                <div className="text-xs text-slate-500 mt-0.5">Total incidents</div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-4">
                <div className={`text-2xl font-bold ${incidentStats.ongoing > 0 ? "text-red-400" : "text-slate-400"}`}>
                  {incidentStats.ongoing}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Ongoing now</div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-4">
                <div className="text-2xl font-bold text-green-400">{incidentStats.resolved}</div>
                <div className="text-xs text-slate-500 mt-0.5">Resolved</div>
              </div>
            </div>

            {/* Paginated table — shows job name column */}
            <PaginatedIncidentTable
              incidents={allIncidentsEnriched}
              pageSize={15}
              showJobName={true}
            />
          </div>
        )}
      </div>

      {/* FORM SLIDE-IN */}
      {showForm && (
        <FormModal onClose={handleCloseForm}>
          <CreateJobForm
            editJob={editingJob}
            onCreated={() => { loadJobs(); handleCloseForm(); }}
            onUpdated={async () => {
              await loadJobs();
              if (selectedJob && editingJob?.id === selectedJob.id) {
                loadAll(editingJob.id);
              }
              handleCloseForm();
            }}
            onCancelEdit={handleCloseForm}
          />
        </FormModal>
      )}
    </div>
    </>
  );
}