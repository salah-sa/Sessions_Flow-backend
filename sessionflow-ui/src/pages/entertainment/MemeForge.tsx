import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, ThumbsUp, ThumbsDown, Plus, Sparkles, Clock, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { useMemeTemplates, useMemeGallery, useMyMemes, useCreateMeme, useVoteMeme } from "../../queries/useEntertainmentQueries";

type Tab = "create" | "gallery" | "mine";

const MemeForge: React.FC = () => {
  const [tab, setTab] = useState<Tab>("gallery");
  const [sort, setSort] = useState("hot");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");

  const { data: templates } = useMemeTemplates();
  const { data: gallery } = useMemeGallery(sort);
  const { data: myMemes } = useMyMemes();
  const createMeme = useCreateMeme();
  const voteMeme = useVoteMeme();

  const selectedTpl = templates?.find((t) => t.id === selectedTemplate);

  const handleCreate = () => {
    if (!selectedTemplate || !topText.trim() || !bottomText.trim()) return;
    createMeme.mutate({ templateId: selectedTemplate, topText, bottomText }, {
      onSuccess: () => { setTopText(""); setBottomText(""); setSelectedTemplate(null); setTab("gallery"); }
    });
  };

  const preview = selectedTpl
    ? selectedTpl.format.replace("{top}", topText || "...").replace("{bottom}", bottomText || "...")
    : "";

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] overflow-hidden relative">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-pink-600/8 via-rose-600/6 to-orange-600/8 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="px-4 py-6 sm:px-8 shrink-0 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 mb-3">
            <Palette className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">Meme Forge</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Create Study Memes</h1>
          <p className="text-xs text-slate-500">Pick a template, add your twist, share with everyone.</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-8 mb-4 relative z-10">
        <div className="flex gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1">
          {(["gallery", "create", "mine"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize",
                tab === t ? "bg-pink-500/20 text-pink-400" : "text-slate-500 hover:text-slate-300")}>
              {t === "mine" ? "My Memes" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 custom-scrollbar relative z-10">
        <AnimatePresence mode="wait">

          {/* ── Gallery ── */}
          {tab === "gallery" && (
            <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto space-y-4">
              <div className="flex gap-2">
                {["hot", "new", "top"].map((s) => (
                  <button key={s} onClick={() => setSort(s)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all",
                      sort === s ? "bg-pink-500/20 border-pink-500/30 text-pink-400" : "bg-white/[0.02] border-white/5 text-slate-500")}>
                    {s === "hot" ? "🔥 Hot" : s === "new" ? "🆕 New" : "⭐ Top"}
                  </button>
                ))}
              </div>

              {gallery?.map((meme, i) => (
                <motion.div key={meme.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
                  <pre className="text-sm text-white font-sans whitespace-pre-wrap leading-relaxed">{meme.renderedText}</pre>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => voteMeme.mutate({ memeId: meme.id, voteType: "up" })}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                        <ThumbsUp className="w-3.5 h-3.5" /> {meme.upvotes}
                      </button>
                      <button onClick={() => voteMeme.mutate({ memeId: meme.id, voteType: "down" })}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
                        <ThumbsDown className="w-3.5 h-3.5" /> {meme.downvotes}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock className="w-3 h-3" /> {new Date(meme.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </motion.div>
              ))}
              {(!gallery || gallery.length === 0) && (
                <div className="text-center py-12">
                  <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No memes yet. Be the first creator!</p>
                  <button onClick={() => setTab("create")} className="mt-3 px-4 py-2 rounded-lg bg-pink-500/20 text-pink-400 text-xs font-semibold">Create One</button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Create ── */}
          {tab === "create" && (
            <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto space-y-4">
              <p className="text-xs font-semibold text-slate-400">1. Pick a Template</p>
              <div className="grid grid-cols-2 gap-2">
                {templates?.map((t) => (
                  <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                    className={cn("p-3 rounded-xl text-left border transition-all",
                      selectedTemplate === t.id ? "bg-pink-500/15 border-pink-500/30" : "bg-white/[0.02] border-white/5 hover:border-white/10")}>
                    <span className="text-xl mb-1 block">{t.emoji}</span>
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{t.category}</p>
                  </button>
                ))}
              </div>

              {selectedTpl && (
                <>
                  <p className="text-xs font-semibold text-slate-400 mt-2">2. Fill in the blanks</p>
                  <div className="space-y-2">
                    <input type="text" value={topText} onChange={(e) => setTopText(e.target.value)} placeholder="Top text..." maxLength={80}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-pink-500/40" />
                    <input type="text" value={bottomText} onChange={(e) => setBottomText(e.target.value)} placeholder="Bottom text..." maxLength={80}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-pink-500/40" />
                  </div>

                  {/* Preview */}
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Preview</p>
                    <pre className="text-sm text-white font-sans whitespace-pre-wrap leading-relaxed">{preview}</pre>
                  </div>

                  <button onClick={handleCreate} disabled={createMeme.isPending || !topText.trim() || !bottomText.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> {createMeme.isPending ? "Creating..." : "Publish Meme"}
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* ── My Memes ── */}
          {tab === "mine" && (
            <motion.div key="mine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto space-y-3">
              {myMemes?.map((meme) => (
                <div key={meme.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                  <pre className="text-sm text-white font-sans whitespace-pre-wrap leading-relaxed mb-2">{meme.renderedText}</pre>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="text-emerald-400">👍 {meme.upvotes}</span>
                    <span className="text-red-400">👎 {meme.downvotes}</span>
                    <span className="ml-auto">{new Date(meme.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {(!myMemes || myMemes.length === 0) && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <User className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                  You haven't created any memes yet.
                  <br />
                  <button onClick={() => setTab("create")} className="mt-3 px-4 py-2 rounded-lg bg-pink-500/20 text-pink-400 text-xs font-semibold">Create Your First</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MemeForge;
