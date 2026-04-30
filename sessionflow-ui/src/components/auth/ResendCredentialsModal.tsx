import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  Hash
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../ui';
import { resendCredentials } from '../../api/authService';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface ResendCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResendCredentialsModal: React.FC<ResendCredentialsModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setEmail('');
        setSuccess(false);
        setRemaining(null);
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
      toast.error("Please enter a valid email address.");
      return;
    }
    
    setLoading(true);
    const res = await resendCredentials(email);
    setLoading(false);
    
    if (res.success) {
      setSuccess(true);
      setRemaining(res.remaining ?? null);
      toast.success(res.message || "Credentials sent!");
    } else {
      if (res.error?.includes("Sandbox")) {
        toast.error("Email Restriction", {
          description: "Resend is in Sandbox mode. You can only send to your own registered email address until you verify a domain.",
          duration: 8000
        });
      } else {
        toast.error(res.error || "Failed to resend credentials.");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-[440px] bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(34,197,94,0.15)]"
          onClick={e => e.stopPropagation()}
        >
          {/* Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          
          <div className="p-8 sm:p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={onClose}
                className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10"
              >
                <ArrowLeft className={cn("w-5 h-5", isRTL && "rotate-180")} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {!success ? (
                <motion.div 
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-2">Recovery</h2>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em]">Resend sign-in details</p>
                  </div>
                  
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-[12px] text-emerald-200/60 leading-relaxed italic">
                      If you were approved by an admin but didn't receive your ID or code, enter your email here.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Registered Email</label>
                    <Input 
                      placeholder="ENTER REGISTERED EMAIL" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      disabled={loading}
                      autoFocus
                    />
                  </div>

                  <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-200/50 leading-tight">
                      Security Policy: You can use this recovery feature up to 3 times per day.
                    </p>
                  </div>

                  <Button 
                    className="w-full h-14 rounded-2xl group shadow-emerald-500/20" 
                    onClick={handleSubmit} 
                    disabled={loading || !email.includes('@')}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <span className="mr-2">Send Details</span>
                        <ArrowRight className={cn("w-4 h-4 group-hover:translate-x-1 transition-transform", isRTL && "rotate-180 group-hover:-translate-x-1")} />
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="text-center py-6"
                >
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 bg-emerald-500 opacity-20 blur-3xl rounded-full animate-pulse" />
                    <div className="relative w-24 h-24 rounded-[32px] bg-emerald-500 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                      <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white uppercase tracking-widest mb-4">
                    Dispatched
                  </h2>
                  <p className="text-[13px] text-slate-400 max-w-[280px] mx-auto leading-relaxed mb-6">
                    Your credentials have been sent to <strong>{email}</strong>. Please check your inbox and spam folder.
                  </p>

                  {remaining !== null && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 mb-10">
                        <Hash className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {remaining} requests remaining today
                        </span>
                    </div>
                  )}

                  <Button 
                    variant="glow" 
                    className="w-full h-14 rounded-2xl"
                    onClick={onClose}
                  >
                    Back to Login
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="px-10 py-6 bg-white/[0.02] border-t border-white/5 text-center">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.4em]">
              SESSIONFLOW SECURITY ENFORCEMENT
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
