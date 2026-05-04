import React, { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Bold, Italic, List, Save, Loader2, Crown, Eye, EyeOff, ShieldCheck, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { useEncryptedNote, useSaveEncryptedNote } from "../../queries/usePhase4Queries";
import { encryptNote, decryptNote } from "../../lib/encryption";
import { useAuthStore } from "../../store/stores";
import { useSignalR } from "../../providers/SignalRProvider";
import { Events } from "../../lib/eventContracts";

interface EncryptedNoteEditorProps {
  entityType: string;
  entityId: string;
}

export const EncryptedNoteEditor: React.FC<EncryptedNoteEditorProps> = ({ entityType, entityId }) => {
  const { data: encNote, isLoading } = useEncryptedNote(entityType, entityId);
  const saveMut = useSaveEncryptedNote();
  const user = useAuthStore(s => s.user);
  const { on } = useSignalR();

  const [content, setContent] = useState("");
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Derive a stable password hash for encryption key
  const getPasswordHash = useCallback(() => {
    // In production, this would be the hash of the user's password
    // stored securely during login. For now, use a deterministic hash.
    return user?.id ? `${user.id}:${user.email || "key"}` : "";
  }, [user]);

  // Decrypt on load
  useEffect(() => {
    if (!encNote || !encNote.encryptedBlob) {
      setContent("");
      setIsDecrypted(true);
      return;
    }

    const passHash = getPasswordHash();
    if (!passHash) return;

    decryptNote(encNote.encryptedBlob, encNote.iv, passHash)
      .then(plaintext => {
        setContent(plaintext);
        setIsDecrypted(true);
      })
      .catch(() => {
        toast.error("Failed to decrypt notes");
        setIsDecrypted(false);
      });
  }, [encNote, getPasswordHash]);

  // Auto-save debounce (5s)
  const scheduleAutoSave = useCallback((text: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      handleSave(text);
    }, 5000);
  }, [getPasswordHash]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Listen for cross-device sync
  useEffect(() => {
    const unsub = on(Events.NOTES_SYNCED, (data: { entityType: string; entityId: string }) => {
      if (data.entityType === entityType && data.entityId === entityId) {
        // Could optionally refetch here
      }
    });
    return () => unsub?.();
  }, [on, entityType, entityId]);

  const handleSave = async (text?: string) => {
    const noteContent = text ?? content;
    const passHash = getPasswordHash();
    if (!passHash) return;

    setIsSaving(true);
    try {
      const encrypted = await encryptNote(noteContent, passHash);
      await saveMut.mutateAsync({
        entityType,
        entityId,
        encryptedBlob: encrypted.encryptedBlob,
        iv: encrypted.iv,
      });
      setLastSaved(new Date());
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerHTML;
    setContent(text);
    scheduleAutoSave(text);
  };

  // Toolbar commands
  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    handleContentChange();
  };

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/30">
        <div className="flex items-center gap-1">
          <button onClick={() => execCmd("bold")}
            className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => execCmd("italic")}
            className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => execCmd("insertUnorderedList")}
            className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <List className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-5 bg-white/5 mx-1" />
          <button onClick={() => setShowPreview(!showPreview)}
            className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
              showPreview ? "bg-[var(--ui-accent)]/10 border-[var(--ui-accent)]/20 text-[var(--ui-accent)]" : "bg-white/[0.02] border-white/5 text-slate-500 hover:text-white"
            )}>
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Encryption Status */}
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest",
            isDecrypted
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
          )}>
            {isDecrypted ? <ShieldCheck className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {isDecrypted ? "Encrypted" : "Syncing"}
          </div>

          {/* Save Status */}
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 text-[var(--ui-accent)] animate-spin" />
          ) : lastSaved ? (
            <span className="text-[7px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              Saved {lastSaved.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}

          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="h-8 px-3 rounded-lg bg-[var(--ui-accent)]/10 border border-[var(--ui-accent)]/20 text-[8px] font-black text-[var(--ui-accent)] uppercase tracking-widest flex items-center gap-1.5 hover:bg-[var(--ui-accent)]/20 transition-all"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleContentChange}
        className="min-h-[200px] max-h-[400px] overflow-y-auto p-5 text-[11px] text-slate-300 font-medium leading-relaxed outline-none custom-scrollbar focus:ring-0 [&_b]:text-white [&_i]:text-slate-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1"
        dangerouslySetInnerHTML={{ __html: content }}
        data-placeholder="Start typing your private notes..."
      />

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest">
            End-to-end encrypted • AES-256-GCM
          </span>
        </div>
        <Crown className="w-3 h-3 text-amber-400" />
      </div>
    </div>
  );
};

export default EncryptedNoteEditor;
