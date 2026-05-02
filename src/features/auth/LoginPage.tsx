import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Shield, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getRoleRedirect } from './utils/getRoleRedirect';
import { loginAction } from './actions/loginAction';
import { Turnstile } from '@marsidev/react-turnstile';

const emailSchema = z.object({
  email: z.string().email("ENTER A VALID ORGANIZATION EMAIL"),
});

const passwordSchema = z.object({
  password: z.string().min(1, "PASSWORD IS REQUIRED"),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const APP_VERSION = "v0.1.0-stable";
const SYSTEM_NAME = "VLM ENTERPRISE HUB";

export function LoginPage() {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const navigate = useNavigate();

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
    setServerError(null);
  };

  const handleTurnstileError = () => {
    setTurnstileToken('');
    setServerError('Security check failed. Please try again.');
  };

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onEmailSubmit = (data: EmailFormValues) => {
    setEmail(data.email);
    setStep('password');
    setServerError(null);
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!turnstileToken) {
      setServerError('Security check required.');
      return;
    }
    setServerError(null);
    const result = await loginAction(email, data.password, turnstileToken);
    
    if (result.success && result.role) {
      navigate(getRoleRedirect(result.role), { replace: true });
    } else {
      setServerError(result.error || 'AUTHENTICATION FAILED');
      // Reset turnstile token when there is an error to prompt re-verification
      setTurnstileToken('');
    }
  };

  return (
    <div className="flex h-screen w-full flex-col md:flex-row bg-white font-sans selection:bg-slate-900 selection:text-white overflow-hidden">
      {/* Left Panel: Executive Branding */}
      <div className="relative hidden w-[40%] flex-col justify-between bg-slate-900 p-12 text-white md:flex">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 z-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

        <div className="relative z-10">
            <div className="mb-12 flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20">
            <RefreshCcw className="h-7 w-7 text-white" />
          </div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-extralight tracking-tight text-white/90 leading-tight">
              {SYSTEM_NAME}
            </h1>
            <div className="mt-6 h-1 w-16 bg-indigo-500" />
            <p className="mt-8 text-sm font-medium text-slate-400 max-w-xs leading-relaxed">
              Precision tracking for commercial vehicle lifecycles. From acquisition to end-of-life solutions for modern dealership networks.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 flex flex-col space-y-8">
          <div className={`flex items-center space-x-5 transition-opacity duration-500 ${step === 'email' ? 'opacity-100' : 'opacity-40'}`}>
             <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-[11px] font-black ring-1 ring-slate-700">01</div>
             <p className="text-[11px] font-black uppercase tracking-[0.2em]">Identify Node</p>
          </div>
          <div className={`flex items-center space-x-5 transition-opacity duration-500 ${step === 'password' ? 'opacity-100' : 'opacity-40'}`}>
             <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-[11px] font-black ring-1 ring-slate-700">02</div>
             <p className="text-[11px] font-black uppercase tracking-[0.2em]">Authorize Key</p>
          </div>
        </div>

        <div className="relative z-10">
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
             SECURE INTERFACE / DATA ENCRYPTED
           </p>
        </div>
      </div>

      {/* Right Panel: Auth Flow */}
      <div className="flex flex-1 flex-col justify-between bg-white">
        {/* Mobile App Header (Visible only on small screens) */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 md:hidden">
          <div className="flex items-center space-x-3">
            <RefreshCcw className="h-5 w-5 text-slate-900" />
            <span className="text-[10px] font-black uppercase tracking-widest">{SYSTEM_NAME}</span>
          </div>
          <span className="text-[9px] font-black text-slate-400 tracking-tighter">{APP_VERSION}</span>
        </div>

        <div className="flex flex-1 items-center justify-center p-8 md:p-24 lg:p-32">
          <div className="w-full max-w-[420px]">
            <AnimatePresence mode="wait">
              {step === 'email' ? (
                <motion.div
                  key="email-step"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-12"
                >
                  <div className="space-y-4">
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">Welcome Back.</h2>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                      Enter your organization identifier to access the secure portal.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase">Organization Identifier</label>
                       <input
                          {...registerEmail('email')}
                          className="w-full border-b-2 border-slate-100 bg-transparent py-4 text-xl font-medium text-slate-900 transition-all focus:border-indigo-600 outline-none placeholder:text-slate-200 lowercase"
                          placeholder="name@organization.com"
                          autoFocus
                          autoComplete="email"
                       />
                       {emailErrors.email && (
                         <p className="text-[10px] font-black text-rose-600 mt-2 uppercase tracking-wide">{emailErrors.email.message}</p>
                       )}
                    </div>

                    <Button type="submit" className="relative w-full h-16 bg-slate-900 hover:bg-slate-800 transition-all rounded-none shadow-lg shadow-slate-100">
                      <span className="text-[11px] font-black tracking-[0.2em] uppercase">Advance to Security</span>
                      <motion.div 
                        className="absolute right-6 top-1/2 -translate-y-1/2"
                        animate={{ x: [-10, 5], opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </motion.div>
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="password-step"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-12"
                >
                    <div className="group flex items-center justify-between border-b-2 border-slate-900/5 bg-slate-50 p-6 transition-all hover:bg-slate-100">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Active Identity</p>
                        <p className="text-sm font-bold text-slate-900 tracking-tight">{email}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setStep('email')}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all hover:border-slate-400 hover:text-slate-900 shadow-sm"
                      title="Change Account"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">Authorize Key.</h2>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                      Provider your credential key to unlock the enterprise portal associated with this identity.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase">Credential Key</label>
                       <input
                          type="password"
                          {...registerPassword('password')}
                          className="w-full border-b-2 border-slate-100 bg-transparent py-4 text-xl font-medium text-slate-900 transition-all focus:border-indigo-600 outline-none placeholder:text-slate-200 tracking-[0.5em]"
                          placeholder="••••••••"
                          autoFocus
                          autoComplete="current-password"
                       />
                       {passwordErrors.password && (
                         <p className="text-[10px] font-black text-rose-600 mt-2 uppercase tracking-wide">{passwordErrors.password.message}</p>
                       )}
                    </div>

                    {serverError && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center space-x-4 border-l-4 border-rose-600 bg-rose-50 p-5 shadow-sm"
                      >
                        <Shield className="h-6 w-6 text-rose-600" />
                        <p className="text-[10px] font-black text-rose-950 uppercase tracking-[0.1em] leading-tight">
                          Authorization Failure: {serverError}
                        </p>
                      </motion.div>
                    )}

                    <div className="flex justify-center">
                      <Turnstile
                        siteKey={import.meta.env.DEV ? '1x00000000000000000000AA' : (import.meta.env.VITE_TURNSTILE_SITE_KEY || '')}
                        onSuccess={handleTurnstileSuccess}
                        onError={handleTurnstileError}
                        onExpire={handleTurnstileError}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="relative w-full h-16 bg-slate-900 hover:bg-slate-800 transition-all rounded-none shadow-lg shadow-slate-100 disabled:opacity-50"
                      isLoading={isSubmitting}
                      disabled={!turnstileToken}
                    >
                      <span className="text-[11px] font-black tracking-[0.2em] uppercase">Authorize Access</span>
                      <motion.div 
                        className="absolute right-6 top-1/2 -translate-y-1/2"
                        animate={{ x: [-10, 5], opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </motion.div>
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dynamic Professional Footer info */}
        <div className="flex flex-col space-y-6 p-8 border-t border-slate-50 bg-slate-50/50 md:flex-row md:items-center md:justify-between md:space-y-0 md:px-12">
          <div className="flex items-center space-x-3">
            <Shield className="h-4 w-4 text-slate-300" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">
              System monitoring active: all activities are recorded
            </p>
          </div>
          <div className="flex items-center space-x-10">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Version</span>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">{APP_VERSION}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
