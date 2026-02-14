import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export const formatDateTime = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy/MM/dd hh:mm a', { locale: ar });
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const exportToExcel = (rows: any[][], filename: string) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if(!ws['!cols']) ws['!cols'] = [];
  ws['!views'] = [{RTL: true}];
  XLSX.utils.book_append_sheet(wb, ws, "تقرير العربية");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const downloadItemTemplate = () => {
  const headers = ['barcode', 'name', 'unit_name', 'opening_balance', 'min_threshold'];
  const example = ['1001', 'صاج حديد 2مم', 'كيلو', '100', '10'];
  const csvContent = "\uFEFF" + headers.join(',') + '\n' + example.join(',');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `alarabia_items_template.csv`);
  link.click();
};
