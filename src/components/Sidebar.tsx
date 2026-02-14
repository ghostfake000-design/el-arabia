import React from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { MENU_ITEMS } from '../../constants';
import { User } from '../../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser }) => {
  const filteredItems = (globalThis as any).MENU_ITEMS || [];

  return (
    <div className="w-72 h-full bg-[#111827] border-l border-slate-800 flex flex-col">
      <div className="p-8">
        <h1 className="text-2xl font-black text-white">الشركة العربية</h1>
      </div>
      <nav className="flex-1 px-6 py-4">
        {filteredItems.map((item: any) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className="w-full p-4 text-sm text-slate-300 text-right">{item.label}</button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
