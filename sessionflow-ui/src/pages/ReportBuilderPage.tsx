import React, { useState, useCallback } from "react";
import { FileText, Plus, Trash2, Play, Save, Crown, GripVertical, BarChart3, TrendingUp, PieChart, Table, Loader2, Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { useReportTemplates, useSaveReport, useDeleteReport, useGenerateReport } from "../queries/usePhase4Queries";
import type { ReportBlock, ReportData } from "../api/premiumFeatures";

type ChartType = ReportBlock["chartType"];
type SourceType = ReportBlock["source"];

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "attendance", label: "Attendance" },
  { value: "revenue", label: "Revenue" },
  { value: "students", label: "Students" },
  { value: "sessions", label: "Sessions" },
];

const CHART_OPTIONS: { value: ChartType; label: string; icon: React.ElementType }[] = [
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "line", label: "Line", icon: TrendingUp },
  { value: "donut", label: "Donut", icon: PieChart },
  { value: "table", label: "Table", icon: Table },
];

const METRIC_MAP: Record<SourceType, string[]> = {
  attendance: ["rate", "count", "present", "absent"],
  revenue: ["total", "average", "growth"],
  students: ["enrolled", "active", "churned"],
  sessions: ["total", "completed", "cancelled"],
};

// ── Block Editor ────────────────────────────────────────────
const BlockEditor: React.FC<{
  block: ReportBlock;
  index: number;
  onChange: (idx: number, block: ReportBlock) => void;
  onRemove: (idx: number) => void;
}> = ({ block, index, onChange, onRemove }) => {
  const metrics = METRIC_MAP[block.source] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className="p-4 rounded-2xl border border-white/5 bg-black/20 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3.5 h-3.5 text-slate-700 cursor-grab" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            Block {index + 1}
          </span>
        </div>
        <button onClick={() => onRemove(index)} className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-600 hover:text-rose-400 transition-all">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Source */}
        <div>
          <label className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Source</label>
          <select
            value={block.source}
            onChange={e => onChange(index, { ...block, source: e.target.value as SourceType, metric: METRIC_MAP[e.target.value as SourceType][0] })}
            className="w-full h-9 px-3 rounded-xl bg-black/30 border border-white/5 text-[10px] font-bold text-white appearance-none"
          >
            {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Metric */}
        <div>
          <label className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Metric</label>
          <select
            value={block.metric}
            onChange={e => onChange(index, { ...block, metric: e.target.value })}
            className="w-full h-9 px-3 rounded-xl bg-black/30 border border-white/5 text-[10px] font-bold text-white appearance-none"
          >
            {metrics.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Chart Type */}
        <div>
          <label className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Chart</label>
          <div className="flex gap-1">
            {CHART_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button key={opt.value} onClick={() => onChange(index, { ...block, chartType: opt.value })}
                  className={cn(
                    "w-9 h-9 rounded-lg border flex items-center justify-center transition-all",
                    block.chartType === opt.value
                      ? "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/20 text-[var(--ui-accent)]"
                      : "bg-white/[0.02] border-white/5 text-slate-600 hover:text-slate-400"
                  )}
                  title={opt.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Group By */}
        <div>
          <label className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Group By</label>
          <select
            value={block.groupBy || ""}
            onChange={e => onChange(index, { ...block, groupBy: e.target.value || undefined })}
            className="w-full h-9 px-3 rounded-xl bg-black/30 border border-white/5 text-[10px] font-bold text-white appearance-none"
          >
            <option value="">None</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="group">Group</option>
          </select>
        </div>
      </div>
    </motion.div>
  );
};

// ── Preview Block ───────────────────────────────────────────
const PreviewBlock: React.FC<{ block: ReportBlock; result?: Record<string, unknown>[] }> = ({ block, result }) => {
  if (!result || result.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center rounded-2xl border border-white/5 bg-black/10">
        <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">No data</p>
      </div>
    );
  }

  const maxVal = Math.max(...result.map(r => Number(r.value) || 0), 1);

  if (block.chartType === "bar" || block.chartType === "line") {
    return (
      <div className="p-4 rounded-2xl border border-white/5 bg-black/10 space-y-2">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">
          {block.source} — {block.metric}
        </p>
        {result.map((r, idx) => (
          <motion.div key={idx} initial={{ width: 0 }} animate={{ width: "100%" }} className="flex items-center gap-2">
            <span className="text-[8px] font-bold text-slate-500 w-16 truncate">{String(r.label)}</span>
            <div className="flex-1 h-5 bg-white/[0.02] rounded-lg overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(Number(r.value) / maxVal) * 100}%` }}
                transition={{ duration: 0.6, delay: idx * 0.05 }}
                className="h-full rounded-lg bg-gradient-to-r from-[var(--ui-accent)]/20 to-[var(--ui-accent)]/40"
              />
            </div>
            <span className="text-[9px] font-black text-white tabular-nums w-10 text-right">{Number(r.value)}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl border border-white/5 bg-black/10">
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">
        {block.source} — {block.metric}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <tbody>
            {result.map((r, idx) => (
              <tr key={idx} className="border-b border-white/5">
                <td className="py-2 text-slate-400 font-bold">{String(r.label)}</td>
                <td className="py-2 text-white font-black text-right tabular-nums">{String(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Main Page ───────────────────────────────────────────────
const ReportBuilderPage: React.FC = () => {
  const { data: templates, isLoading: templatesLoading } = useReportTemplates();
  const saveMut = useSaveReport();
  const deleteMut = useDeleteReport();
  const generateMut = useGenerateReport();
  const [blocks, setBlocks] = useState<ReportBlock[]>([]);
  const [reportName, setReportName] = useState("");
  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const addBlock = () => {
    setBlocks(prev => [...prev, { source: "attendance", metric: "rate", chartType: "bar" }]);
  };

  const updateBlock = (idx: number, block: ReportBlock) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? block : b));
  };

  const removeBlock = (idx: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    if (blocks.length === 0) { toast.info("Add at least one data block"); return; }
    try {
      const result = await generateMut.mutateAsync({ blocks });
      setPreviewData(result);
    } catch {
      toast.error("Failed to generate report");
    }
  };

  const handleSave = async () => {
    if (!reportName.trim()) { toast.info("Enter a report name"); return; }
    try {
      await saveMut.mutateAsync({ name: reportName, schema: { blocks } });
      toast.success("Report template saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const loadTemplate = (template: any) => {
    setBlocks(template.schema.blocks);
    setReportName(template.name);
    setSelectedTemplateId(template.id);
    setPreviewData(null);
  };

  return (
    <div className="flex-1 flex min-h-0 bg-[var(--ui-bg)]">
      {/* Left: Templates Panel */}
      <div className="w-64 border-r border-white/5 bg-black/20 flex flex-col">
        <div className="px-4 py-4 border-b border-white/5">
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[var(--ui-accent)]" />
            Templates
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {templatesLoading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin" />
            </div>
          ) : (
            (templates || []).map(t => (
              <button
                key={t.id}
                onClick={() => loadTemplate(t)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all group",
                  selectedTemplateId === t.id
                    ? "bg-[var(--ui-accent)]/5 border-[var(--ui-accent)]/15"
                    : "bg-transparent border-transparent hover:bg-white/[0.02]"
                )}
              >
                <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{t.name}</p>
                <p className="text-[8px] font-bold text-slate-600 mt-0.5">{t.schema.blocks.length} blocks</p>
                <button
                  onClick={e => { e.stopPropagation(); deleteMut.mutate(t.id); }}
                  className="mt-2 w-6 h-6 rounded-md bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-700 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Center: Builder */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-white/5 bg-black/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                Report Builder
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={reportName}
              onChange={e => setReportName(e.target.value)}
              placeholder="Report name..."
              className="h-9 w-48 px-3 rounded-xl bg-black/30 border border-white/5 text-[10px] font-bold text-white placeholder:text-slate-700"
            />
            <button onClick={handleSave} disabled={saveMut.isPending}
              className="h-9 px-4 rounded-xl bg-white/[0.03] border border-white/5 text-[9px] font-black text-slate-500 hover:text-white flex items-center gap-2 transition-all">
              {saveMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
            <button onClick={handleGenerate} disabled={generateMut.isPending || blocks.length === 0}
              className="h-9 px-4 rounded-xl bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 text-[9px] font-black text-[var(--ui-accent)] flex items-center gap-2 hover:bg-[var(--ui-accent)]/20 transition-all">
              {generateMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Preview
            </button>
          </div>
        </div>

        {/* Builder + Preview */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Block List */}
            <div className="space-y-3">
              <AnimatePresence>
                {blocks.map((block, idx) => (
                  <BlockEditor key={idx} block={block} index={idx} onChange={updateBlock} onRemove={removeBlock} />
                ))}
              </AnimatePresence>

              <button onClick={addBlock}
                className="w-full h-14 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:border-[var(--ui-accent)]/30 hover:text-[var(--ui-accent)] transition-all">
                <Plus className="w-4 h-4" />
                Add Data Block
              </button>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              {previewData ? (
                previewData.blockResults.map((br, idx) => (
                  <PreviewBlock key={idx} block={blocks[br.blockIndex]} result={br.data} />
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-black/10">
                  <BarChart3 className="w-10 h-10 text-slate-800 mb-3" />
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Click "Preview" to see results</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilderPage;
