import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag, ToggleLeft, ToggleRight, Plus, Trash2,
  Shield, Crown, Zap, ChevronDown, Loader2, AlertTriangle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "../api/client";
import { cn } from "../lib/utils";
import { toast } from "sonner";

// ── API ─────────────────────────────────────────────────────────────────────
interface FlagRecord { id: string; key: string; name: string; description: string; enabled: boolean; allowedTiers: string[]; overrideUserIds: string[]; updatedBy: string; updatedAt: string }

const flagsApi = {
  getAll: () => fetchWithAuth<FlagRecord[]>("/admin/flags"),
  create: (data: unknown) => fetchWithAuth<FlagRecord>("/admin/flags", { method: "POST", body: JSON.stringify(data) }),
  update: (key: string, data: unknown) => fetchWithAuth<{ message: string }>(`/admin/flags/${key}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (key: string) => fetchWithAuth<{ message: string }>(`/admin/flags/${key}`, { method: "DELETE" }),
};

const TIERS = ["Free", "Pro", "Ultra", "Enterprise"];
const TIER_COLORS: Record<string, string> = {
  Free: "text-slate-400 border-slate-500/30 bg-slate-500/10",
  Pro: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  Ultra: "text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10",
  Enterprise: "text-amber-400 border-amber-500/30 bg-amber-500/10"
};

const DANGER_KEYS = ["payment", "auth", "admin", "wallet"];

// ── Flag Card ───────────────────────────────────────────────────────────────
const FlagCard: React.FC<{ flag: any }> = ({ flag }) => {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const isDanger = DANGER_KEYS.some(k => flag.key.includes(k));

  const toggleMut = useMutation({
    mutationFn: () => flagsApi.update(flag.key, {
      enabled: !flag.enabled,
      allowedTiers: flag.allowedTiers,
      overrideUserIds: flag.overrideUserIds || []
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feature-flags"] }); toast.success(`Flag "${flag.key}" ${!flag.enabled ? "enabled" : "disabled"}`); },
    onError: () => toast.error("Failed to update flag")
  });

  const deleteMut = useMutation({
    mutationFn: () => flagsApi.delete(flag.key),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feature-flags"] }); toast.success("Flag deleted"); },
    onError: () => toast.error("Failed to delete flag")
  });

  return (
    <motion.div
      layout
      className={cn(
        "bg-white/[0.02] border rounded-2xl overflow-hidden transition-all",
        isDanger ? "border-rose-500/20" : "border-white/5 hover:border-white/10"
      )}
    >
      <div className="p-4 flex items-start gap-4">
        {/* Toggle */}
        <button
          onClick={() => toggleMut.mutate()}
          disabled={toggleMut.isPending}
          className="flex-shrink-0 mt-0.5"
        >
          {toggleMut.isPending ? (
            <Loader2 className="w-6 h-6 text-[var(--ui-accent)] animate-spin" />
          ) : flag.enabled ? (
            <ToggleRight className="w-7 h-7 text-emerald-400 hover:opacity-80 transition-opacity" />
          ) : (
            <ToggleLeft className="w-7 h-7 text-slate-600 hover:text-slate-400 transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-[var(--ui-accent)] font-bold">{flag.key}</span>
            {isDanger && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
          </div>
          <p className="text-sm font-semibold text-white mb-1">{flag.name}</p>
          <p className="text-xs text-slate-500 mb-2">{flag.description}</p>
          {/* Tier Badges */}
          <div className="flex flex-wrap gap-1.5">
            {flag.allowedTiers.length === 0 ? (
              <span className="text-[9px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400 font-bold uppercase tracking-wider">All Tiers</span>
            ) : flag.allowedTiers.map((t: string) => (
              <span key={t} className={cn("text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider", TIER_COLORS[t])}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={cn("w-2 h-2 rounded-full", flag.enabled ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-slate-600")} />
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
          </button>
          <button
            onClick={() => { if (confirm(`Delete flag "${flag.key}"?`)) deleteMut.mutate(); }}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Tier Access</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TIERS.map(t => {
                  const active = flag.allowedTiers.includes(t);
                  return (
                    <button key={t} onClick={() => {
                      const tiers = active
                        ? flag.allowedTiers.filter((x: string) => x !== t)
                        : [...flag.allowedTiers, t];
                      flagsApi.update(flag.key, { enabled: flag.enabled, allowedTiers: tiers, overrideUserIds: flag.overrideUserIds || [] })
                        .then(() => qc.invalidateQueries({ queryKey: ["feature-flags"] }));
                    }} className={cn(
                      "text-[10px] px-3 py-1.5 rounded-lg border font-bold uppercase tracking-wider transition-all",
                      active ? TIER_COLORS[t] + " opacity-100" : "border-white/5 text-slate-600 hover:text-slate-400"
                    )}>
                      {t}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-600">
                Updated by <span className="text-slate-500">{flag.updatedBy}</span> · {new Date(flag.updatedAt).toLocaleString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Create Flag Modal ────────────────────────────────────────────────────────
const CreateFlagModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tiers, setTiers] = useState<string[]>(["Enterprise"]);
  const [enabled, setEnabled] = useState(true);

  const mut = useMutation({
    mutationFn: () => flagsApi.create({ key, name, description: desc, enabled, allowedTiers: tiers }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feature-flags"] }); toast.success("Flag created!"); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || "Failed to create flag")
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl">
        <h2 className="text-lg font-black text-white mb-6 flex items-center gap-3">
          <Flag className="w-5 h-5 text-[var(--ui-accent)]" /> Create Feature Flag
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5 block">Flag Key *</label>
            <input value={key} onChange={e => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
              placeholder="e.g. ai.voice_calls"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--ui-accent)]/50 font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5 block">Display Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. AI Voice Calls"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--ui-accent)]/50" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5 block">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--ui-accent)]/50 resize-none" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">Allowed Tiers</label>
            <div className="flex flex-wrap gap-2">
              {TIERS.map(t => (
                <button key={t} onClick={() => setTiers(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                  className={cn("text-[10px] px-3 py-1.5 rounded-lg border font-bold uppercase tracking-wider transition-all",
                    tiers.includes(t) ? TIER_COLORS[t] : "border-white/5 text-slate-600"
                  )}>{t}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl">
            <button onClick={() => setEnabled(!enabled)}>
              {enabled ? <ToggleRight className="w-7 h-7 text-emerald-400" /> : <ToggleLeft className="w-7 h-7 text-slate-600" />}
            </button>
            <span className="text-sm text-slate-300">Enable flag immediately</span>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all font-semibold">
            Cancel
          </button>
          <button onClick={() => mut.mutate()} disabled={!key.trim() || !name.trim() || mut.isPending}
            className="flex-1 py-2.5 rounded-xl bg-[var(--ui-accent)] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity">
            {mut.isPending ? "Creating..." : "Create Flag"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Page ───────────────────────────────────────────────────────────────
const FeatureFlagsPage: React.FC = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: flagsApi.getAll,
    staleTime: 30_000
  });

  const filtered = flags.filter((f: any) =>
    filter === "all" ? true : filter === "enabled" ? f.enabled : !f.enabled
  );

  const enabledCount = flags.filter((f: any) => f.enabled).length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="px-6 pt-6 pb-10 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-[var(--ui-accent)]/20 border border-violet-500/20 flex items-center justify-center">
              <Flag className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Feature Flags</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {enabledCount}/{flags.length} active · Control feature rollouts without redeployment
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--ui-accent)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> New Flag
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3">
          {TIERS.map(t => {
            const count = flags.filter((f: any) => f.allowedTiers.includes(t) && f.enabled).length;
            const Icon = t === "Enterprise" ? Crown : t === "Ultra" ? Zap : Shield;
            return (
              <div key={t} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                <Icon className={cn("w-4 h-4 mx-auto mb-1", TIER_COLORS[t].split(" ")[0])} />
                <div className="text-lg font-black text-white">{count}</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{t}</div>
              </div>
            );
          })}
        </div>

        {/* Filter */}
        <div className="flex gap-1 bg-white/[0.02] rounded-xl p-1 w-fit">
          {(["all", "enabled", "disabled"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
              filter === f ? "bg-[var(--ui-accent)] text-white" : "text-slate-500 hover:text-white"
            )}>{f}</button>
          ))}
        </div>

        {/* Flags List */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--ui-accent)] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Flag className="w-12 h-12 text-slate-700" />
            <p className="text-sm text-slate-500">No flags found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((flag: any) => <FlagCard key={flag.id} flag={flag} />)}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && <CreateFlagModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default FeatureFlagsPage;
