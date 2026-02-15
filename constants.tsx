
import React from 'react';
import { LayoutDashboard, Package, ArrowLeftRight, UserCheck, ClipboardList, Settings, ShieldAlert, FileBarChart, Layers, Database } from 'lucide-react';
import { AppPermission } from './types';

export const COLORS = {
  primary: '#facc15', 
  secondary: '#1e3a8a', 
  accent: '#fde047', 
  danger: '#ef4444', 
  bgDark: '#0a0f1d', 
  bgCard: '#161e31',
};

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  permission: AppPermission;
}

export const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard size={20} />, permission: 'VIEW_DASHBOARD' },
  { id: 'item-coding', label: 'تكويد الأصناف', icon: <Package size={20} />, permission: 'VIEW_CODING' },
  { id: 'movements', label: 'حركة المخازن', icon: <ArrowLeftRight size={20} />, permission: 'VIEW_MOVEMENTS' },
  { id: 'custody', label: 'إدارة العهد', icon: <UserCheck size={20} />, permission: 'VIEW_CUSTODY' },
  { id: 'balances', label: 'أرصدة الأصناف', icon: <Layers size={20} />, permission: 'VIEW_BALANCES' },
  { id: 'inventory', label: 'الجرد والتسوية', icon: <ClipboardList size={20} />, permission: 'VIEW_INVENTORY' },
  { id: 'reports', label: 'مركز التقارير', icon: <FileBarChart size={20} />, permission: 'VIEW_REPORTS' },
  { id: 'users', label: 'إدارة المستخدمين', icon: <ShieldAlert size={20} />, permission: 'VIEW_USERS' },
  { id: 'basic-data', label: 'البيانات الأساسية', icon: <Database size={20} />, permission: 'VIEW_BASIC_DATA' },
  { id: 'settings', label: 'إعدادات النظام', icon: <Settings size={20} />, permission: 'VIEW_SETTINGS' },
];

export const INITIAL_UNITS = [
  { id: '1', name: 'كيلو' },
  { id: '2', name: 'قطعة' },
  { id: '3', name: 'طن' },
];

export const INITIAL_WAREHOUSES = [
  { id: '1', name: 'مخزن الإنتاج' },
  { id: '2', name: 'مخزن الخردة' },
];

export const INITIAL_SUPPLIERS = [
  { id: '1', name: 'شركة النصر للمسبوكات', phone: '01012345678', address: 'القاهرة، مدينة نصر' },
];

export const INITIAL_EMPLOYEES = [
  { id: '1', name: 'أحمد جمال' },
  { id: '2', name: 'ياسر محمود' },
];
