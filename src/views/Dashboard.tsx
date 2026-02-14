import React from 'react';
import { Activity, History, Package, ShoppingCart } from 'lucide-react';
import { Item, Movement } from '../types';
import { formatDateTime } from '../utils';

interface DashboardProps { items: Item[]; movements: Movement[]; currentUser: any }

const Dashboard: React.FC<DashboardProps> = ({ items, movements, currentUser }) => {
  const lowStockItems = items.filter(item => item.minThreshold > 0 && item.currentBalance <= item.minThreshold);
  const recentSettlements = movements.filter(m => m.note?.includes('تسوية جردية')).slice(0,4);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-black">رادار العمليات</h2>
      <div className="mt-4">
        <h3>قائمة المشتريات العاجلة ({lowStockItems.length})</h3>
      </div>
    </div>
  );
};

export default Dashboard;
