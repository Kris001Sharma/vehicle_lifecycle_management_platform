import { useToastState, dismissToast } from '@/hooks/useToast';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export function ToastContainer() {
  const toasts = useToastState();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-center gap-3 w-80 p-4 rounded shadow-lg border ${
              toast.variant === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              toast.variant === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              toast.variant === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {toast.variant === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
            {toast.variant === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />}
            {toast.variant === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
            {toast.variant === 'info' && <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />}
            
            <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
            
            <button 
              onClick={() => dismissToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded-full transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 opacity-70" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
