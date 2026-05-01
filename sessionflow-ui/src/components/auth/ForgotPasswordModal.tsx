import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Key, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../ui';
import { forgotPassword, verifyResetCode, resetPassword } from '../../api/authService';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  loginMode: 'engineer' | 'student';
}

type Step = 'email' | 'verify' | 'reset' | 'success';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ 
  isOpen, 
  onClose,
  loginMode 
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenId, setTokenId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state on close/open
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('email');
        setEmail('');
        setCode(['', '', '', '', '', '']);
        setNewPassword('');
        setConfirmPassword('');
        setTokenId(null);
        setResendTimer(0);
      }, 300);
    }
  }, [isOpen]);

  // Resend timer logic
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => setResendTimer(p => p - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      toast.error(t('auth.login_failed'));
      return;
    }
    
    setLoading(true);
    const res = await forgotPassword(email);
    setLoading(false);
    
    if (res.success) {
      toast.success(t('auth.forgot_password.code_sent', { email }));
      setStep('verify');
      setResendTimer(60);
    } else {
      if (res.error?.includes("Sandbox") || res.error?.includes("administrator")) {
        // Sandbox relay: code was sent to admin — let user proceed to verify step
        toast.warning("Code Sent to Administrator", {
          description: "Resend is in Sandbox mode. Your reset code has been forwarded to the admin — contact them to get your code, then enter it below.",
          duration: 12000,
          icon: <AlertCircle className="w-4 h-4 text-amber-400" />,
        });
        setStep('verify');
        setResendTimer(60);
      } else {
        toast.error(res.error || t('common.error'));
      }
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) return;
    
    setLoading(true);
    const res = await verifyResetCode(email, fullCode);
    setLoading(false);
    
    if (res.success && res.tokenId) {
      setTokenId(res.tokenId);
      setStep('reset');
    } else {
      if (res.error?.includes("Sandbox")) {
        toast.error("Email Restriction", {
          description: "Resend is in Sandbox mode. You can only send to your own registered email address until you verify a domain.",
          duration: 8000
        });
      } else {
        toast.error(res.error || t('auth.forgot_password.invalid_code'));
      }
      // Clear code on error for security
      setCode(['', '', '', '', '', '']);
      codeRefs.current[0]?.focus();
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t('auth.password_strength_low'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwords_dont_match'));
      return;
    }
    if (!tokenId) return;
    
    setLoading(true);
    const res = await resetPassword(tokenId, newPassword);
    setLoading(false);
    
    if (res.success) {
      setStep('success');
    } else {
      toast.error(res.error || t('common.error'));
    }
  };

  const onCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 6).toUpperCase().split('');
      const newCode = [...code];
      pasted.forEach((char, i) => {
        if (index + i < 6) newCode[index + i] = char;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + pasted.length, 5);
      codeRefs.current[nextIndex]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);

    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 }
  };

  const stepVariants = {
    initial: { opacity: 0, x: isRTL ? -20 : 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: isRTL ? 20 : -20 }
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
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-[440px] bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.15)]"
          onClick={e => e.stopPropagation()}
        >
          {/* Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
          
          <div className="p-8 sm:p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={step === 'email' ? onClose : () => setStep(step === 'verify' ? 'email' : 'verify')}
                className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10"
              >
                <ArrowLeft className={cn("w-5 h-5", isRTL && "rotate-180")} />
              </button>
              
              <div className="flex gap-1.5">
                {(['email', 'verify', 'reset'] as Step[]).map((s, i) => (
                  <div 
                    key={s} 
                    className={cn(
                      "h-1 rounded-full transition-all duration-500",
                      step === s ? "w-8 bg-blue-500" : i < ['email', 'verify', 'reset'].indexOf(step) ? "w-4 bg-blue-500/40" : "w-4 bg-slate-800"
                    )}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === 'email' && (
                <motion.div key="step-email" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-2">{t('auth.forgot_password.title')}</h2>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em]">{t('auth.forgot_password.subtitle')}</p>
                  </div>
                  
                  <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-[12px] text-blue-200/60 leading-relaxed italic">
                      {t('auth.forgot_password.enter_email')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('auth.email')}</label>
                    <Input 
                      placeholder="ENTER REGISTERED EMAIL" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                      disabled={loading}
                      autoFocus
                    />
                  </div>

                  <Button 
                    className="w-full h-14 rounded-2xl group shadow-blue-500/20" 
                    onClick={handleSendCode} 
                    disabled={loading || !email.includes('@')}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <span className="mr-2">{t('auth.forgot_password.send_code')}</span>
                        <ArrowRight className={cn("w-4 h-4 group-hover:translate-x-1 transition-transform", isRTL && "rotate-180 group-hover:-translate-x-1")} />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}

              {step === 'verify' && (
                <motion.div key="step-verify" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-8">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-3xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                      <Key className="w-8 h-8 text-blue-500 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest">{t('auth.forgot_password.enter_code')}</h2>
                    <p className="text-[11px] text-slate-500 mt-2 font-medium">
                      {t('auth.forgot_password.code_sent', { email })}
                    </p>
                  </div>

                  <div className="flex justify-between gap-2" dir="ltr">
                    {code.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => codeRefs.current[idx] = el}
                        type="text"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => onCodeChange(idx, e.target.value)}
                        onKeyDown={(e) => onKeyDown(idx, e)}
                        className="w-full max-w-[54px] h-14 bg-black/40 border border-white/10 rounded-xl text-center text-xl font-bold text-blue-400 focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all"
                        disabled={loading}
                      />
                    ))}
                  </div>

                  <div className="space-y-4">
                    <Button 
                      className="w-full h-14 rounded-2xl shadow-blue-500/10" 
                      onClick={handleVerifyCode} 
                      disabled={loading || code.some(c => !c)}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.forgot_password.verify')}
                    </Button>
                    
                    <button 
                      onClick={handleSendCode}
                      disabled={loading || resendTimer > 0}
                      className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-white disabled:opacity-30 flex items-center justify-center gap-2 uppercase tracking-widest transition-colors"
                    >
                      <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                      {resendTimer > 0 ? t('auth.forgot_password.resend_in', { seconds: resendTimer }) : t('auth.forgot_password.resend')}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'reset' && (
                <motion.div key="step-reset" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tighter mb-2">{t('auth.forgot_password.step_reset')}</h2>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em]">{t('auth.forgot_password.subtitle')}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('auth.forgot_password.new_password')}</label>
                      <div className="relative">
                        <Input 
                          type="password"
                          placeholder="••••••••" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={loading}
                          className="pl-12"
                        />
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('auth.forgot_password.confirm_password')}</label>
                      <div className="relative">
                        <Input 
                          type="password"
                          placeholder="••••••••" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={loading}
                          className="pl-12"
                        />
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                  </div>

                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <div className="flex items-center gap-2 text-rose-500 text-[10px] font-bold uppercase tracking-wider bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                      <AlertCircle className="w-4 h-4" />
                      {t('auth.passwords_dont_match')}
                    </div>
                  )}

                  <Button 
                    className="w-full h-14 rounded-2xl shadow-blue-500/20" 
                    onClick={handleResetPassword} 
                    disabled={loading || !newPassword || newPassword !== confirmPassword}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.forgot_password.reset')}
                  </Button>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div 
                  key="step-success" 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="text-center py-6"
                >
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 bg-blue-500 opacity-20 blur-3xl rounded-full animate-pulse" />
                    <div className="relative w-24 h-24 rounded-[32px] bg-blue-500 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.5)]">
                      <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white uppercase tracking-widest mb-4">
                    {t('auth.success')}
                  </h2>
                  <p className="text-[13px] text-slate-400 max-w-[280px] mx-auto leading-relaxed mb-10">
                    {t('auth.forgot_password.success')}
                  </p>

                  <Button 
                    variant="glow" 
                    className="w-full h-14 rounded-2xl"
                    onClick={onClose}
                  >
                    {t('auth.forgot_password.back_to_login')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Footer Branding */}
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
