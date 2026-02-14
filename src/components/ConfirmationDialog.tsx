import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد الحذف',
  cancelText = 'إلغاء',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          <div className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${
            type === 'danger' ? 'bg-red-500/10 text-red-500 shadow-lg shadow-red-500/5' : 'bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-500/5'
          }`}>
            <AlertTriangle size={40} />
          </div>
          
          <h3 className="text-2xl font-black text-white mb-3">{title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">{message}</p>
          
          <div className="flex gap-4">
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={`flex-1 py-4 rounded-2xl font-black text-white transition-all shadow-xl active:scale-95 ${
                type === 'danger' 
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' 
                : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20'
              }`}
            >
              {confirmText}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all border border-slate-700 active:scale-95"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
