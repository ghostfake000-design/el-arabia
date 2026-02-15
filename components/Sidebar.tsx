
import React from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { MENU_ITEMS } from '../constants';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser }) => {
  // تصفية القائمة بناءً على صلاحيات العرض VIEW_...
  const filteredItems = MENU_ITEMS.filter(item => 
    currentUser.permissions.includes(item.permission)
  );

  return (
    <div className="w-72 h-full bg-[#111827] border-l border-slate-800 flex flex-col transition-all duration-300 shadow-[20px_0_50px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Logo Section */}
      <div className="p-8 flex flex-col items-center relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/5 rounded-full blur-3xl"></div>
        <div className="relative mb-6 perspective-1000 group cursor-pointer">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-950 rounded-[2rem] flex items-center justify-center shadow-[0_15px_35px_rgba(0,0,0,0.5)] border border-white/5 transform-style-3d rotate-x-12 rotate-y-[-12deg] group-hover:rotate-x-0 group-hover:rotate-y-0 transition-transform duration-700">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[spin_10s_linear_infinite]">
              <Settings className="text-yellow-500 drop-shadow-[0_4px_0_#92400e]" size={56} strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1 -right-1 animate-[spin_6s_linear_infinite_reverse]">
              <Settings className="text-yellow-400/80 drop-shadow-[0_2px_0_#78350f]" size={32} strokeWidth={2} />
            </div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse blur-[2px]"></div>
          </div>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg rotate-12 border-2 border-[#111827] group-hover:rotate-0 transition-transform">
            <span className="text-[10px] font-black text-white">AR</span>
          </div>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tighter text-center leading-none">الشركة العربية</h1>
        <p className="text-[9px] text-yellow-400 font-black mt-2 uppercase tracking-[0.4em]">Inventory Systems</p>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 px-6 py-4 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden min-h-0">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between gap-3 px-5 py-4 rounded-[1.25rem] transition-all duration-300 group ${
              activeTab === item.id 
              ? 'bg-yellow-400 text-black shadow-[0_10px_20px_rgba(250,204,21,0.2)]' 
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className={`${activeTab === item.id ? 'text-black' : 'text-slate-600 group-hover:text-yellow-400'} transition-colors`}>
                {item.icon}
              </span>
              <span className="font-black text-sm whitespace-nowrap">{item.label}</span>
            </div>
            {activeTab === item.id && <ChevronLeft size={16} strokeWidth={3} />}
          </button>
        ))}
      </nav>

      {/* Footer User Section */}
      <div className="p-6 border-t border-slate-800 flex-shrink-0">
        <div className="bg-[#1e293b]/30 rounded-2xl p-4 flex items-center gap-4 border border-slate-800/50">
          <div className="w-12 h-12 rounded-xl bg-blue-900/30 border border-blue-500/20 flex items-center justify-center text-yellow-400 font-black shadow-inner">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-100 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{currentUser.role === 'ADMIN' ? 'مدير عام' : currentUser.role === 'MANAGER' ? 'مدير مخزن' : 'أمين مخزن'}</p>
          </div>
        </div>
      </div>
      
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
};

export default Sidebar;
