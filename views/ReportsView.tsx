
import React, { useState, useMemo } from 'react';
import { 
  FileText, Printer, Search, Calendar, Package, UserCheck, 
  ArrowDownLeft, ArrowUpRight, LayoutGrid, FilePieChart, ClipboardList, Clock, 
  Hash, User, ListFilter, TrendingUp, TrendingDown, Layers, History, 
  FileSpreadsheet, AlertTriangle, UserMinus, ShieldCheck, UserCog, ArrowRightLeft,
  RotateCcw, Info, ArrowRight, Wallet, ShoppingBag, Building2, Calculator
} from 'lucide-react';
import { Item, Movement, Custody, Employee, Unit, User as UserType, CustodyState } from '../types';
import { formatDateTime, exportToExcel } from '../utils';

interface ReportsProps {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  movements: Movement[];
  setMovements: React.Dispatch<React.SetStateAction<Movement[]>>;
  custodies: Custody[];
  setCustodies: React.Dispatch<React.SetStateAction<Custody[]>>;
  employees: Employee[];
  units: Unit[];
  currentUser: UserType;
}

type ReportType = 'INVENTORY_ARCHIVE' | 'STOCK_LEDGER' | 'EMPLOYEE_CLEARANCE' | 'STOCK_ALERTS' | 'NET_CONSUMPTION' | 'RETURNS_ARCHIVE';

const ReportsView: React.FC<ReportsProps> = ({ 
  items, setItems, movements, setMovements, custodies, setCustodies, employees, units, currentUser 
}) => {
  const [activeReport, setActiveReport] = useState<ReportType>('STOCK_LEDGER');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterItemId, setFilterItemId] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterWarehouseId, setFilterWarehouseId] = useState('ALL');
  const [filterState, setFilterState] = useState<'ALL' | CustodyState>('ALL');
  
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

  const filterByDateRange = (timestamp: string) => {
    const entryDate = timestamp.split('T')[0];
    const matchesStart = !startDate || entryDate >= startDate;
    const matchesEnd = !endDate || entryDate <= endDate;
    return matchesStart && matchesEnd;
  };

  // --- تقرير سجل حركة صنف تفصيلي ---
  const stockLedger = useMemo(() => {
    if (!filterItemId) return { transactions: [], totals: { in: 0, out: 0, final: 0 } };
    
    const item = items.find(i => i.id === filterItemId);
    if (!item) return { transactions: [], totals: { in: 0, out: 0, final: 0 } };

    let allEntries: any[] = [];

    movements.filter(m => m.itemId === filterItemId).forEach(m => {
      let actionName = m.type === 'INWARD' ? 'إذن توريد مخزني' : 'إذن صرف مخزني';
      if (m.note?.includes('تسوية جردية')) {
        actionName = m.type === 'INWARD' ? 'تسوية جردية (زيادة)' : 'تسوية جردية (عجز)';
      }

      allEntries.push({
        timestamp: m.timestamp,
        docNumber: m.docNumber,
        actionName: actionName,
        in: m.type === 'INWARD' ? m.quantity : 0,
        out: m.type === 'OUTWARD' ? m.quantity : 0,
        user: m.performedBy,
        note: m.note || '-',
        state: 'NEW'
      });

      if (m.returnedQuantity && m.returnedQuantity > 0) {
        allEntries.push({
          timestamp: m.timestamp,
          docNumber: m.returnDocNumber || `RET-${m.docNumber}`,
          actionName: m.type === 'INWARD' ? 'مرتجع توريد (رد لمورد)' : 'مرتجع صرف (رد لمخزن)',
          in: m.type === 'OUTWARD' ? m.returnedQuantity : 0,
          out: m.type === 'INWARD' ? m.returnedQuantity : 0,
          user: m.performedBy,
          note: `مرتجع مرتبط بالسند رقم ${m.docNumber}`,
          state: 'NEW'
        });
      }
    });

    custodies.filter(c => c.itemId === filterItemId).forEach(c => {
      let inQty = 0; let outQty = 0; let action = '';
      if (c.type === 'HANDOVER') { outQty = c.quantity; action = 'صرف عهدة لموظف'; }
      else if (c.type === 'RETURN') { inQty = c.quantity; action = 'استرداد عهدة من موظف'; }
      else if (c.type === 'SETTLEMENT') {
        if (c.note?.includes('تكهين')) action = 'محضر تكهين (إعدام هالك)';
        else action = c.note?.includes('زيادة') ? 'تسوية عهدة (زيادة)' : 'تسوية عهدة (عجز)';
        const isSurplus = c.note?.includes('زيادة');
        if (isSurplus) inQty = c.quantity; else outQty = c.quantity;
      }

      allEntries.push({
        timestamp: c.timestamp,
        docNumber: c.docNumber,
        actionName: action,
        in: inQty,
        out: outQty,
        user: c.performedBy,
        note: c.note || '-',
        state: c.state
      });
    });

    allEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (filterState !== 'ALL') {
      allEntries = allEntries.filter(e => e.state === filterState);
    }

    let runningBalance = item.openingBalance;
    let initialBalanceAtStartDate = item.openingBalance;
    const ledger: any[] = [];

    if (startDate) {
      allEntries.forEach(entry => {
        if (entry.timestamp.split('T')[0] < startDate) {
          initialBalanceAtStartDate += (entry.in - entry.out);
        }
      });
      ledger.push({
        timestamp: startDate,
        docNumber: 'منقول',
        actionName: `رصيد منقول (قبل ${startDate})`,
        in: 0,
        out: 0,
        balance: Math.floor(initialBalanceAtStartDate),
        user: 'النظام',
        note: 'رصيد تراكمي من حركات سابقة'
      });
      runningBalance = initialBalanceAtStartDate;
    } else {
      ledger.push({
        timestamp: item.createdAt,
        docNumber: 'OPEN-INV',
        actionName: 'رصيد أول المدة الأصلي',
        in: Math.floor(item.openingBalance),
        out: 0,
        balance: Math.floor(item.openingBalance),
        user: item.createdBy || 'النظام',
        note: 'الرصيد الابتدائي المسجل عند تكويد الصنف'
      });
    }

    let totalIn = 0;
    let totalOut = 0;

    allEntries.forEach(entry => {
      if (!startDate || entry.timestamp.split('T')[0] >= startDate) {
        if (!endDate || entry.timestamp.split('T')[0] <= endDate) {
          runningBalance += (entry.in - entry.out);
          totalIn += entry.in;
          totalOut += entry.out;
          ledger.push({
            ...entry,
            balance: Math.floor(runningBalance)
          });
        }
      }
    });

    return { 
      transactions: ledger, 
      totals: { in: totalIn, out: totalOut, final: runningBalance } 
    };
  }, [filterItemId, movements, custodies, items, startDate, endDate, filterState]);

  // --- تقارير أخرى ---
  const inventoryArchive = useMemo(() => {
    const allSettlements = [
      ...movements.filter(m => m.note?.includes('تسوية جردية')).map(m => ({...m, source: 'STORAGE'})),
      ...custodies.filter(c => c.type === 'SETTLEMENT').map(c => ({...c, source: 'CUSTODY'}))
    ];
    return allSettlements.filter(s => {
      const item = items.find(i => i.id === s.itemId);
      const matchesDate = filterByDateRange(s.timestamp);
      const matchesItem = !filterItemId || s.itemId === filterItemId;
      const matchesSearch = !searchTerm || item?.name.toLowerCase().includes(searchTerm.toLowerCase()) || item?.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDate && matchesItem && matchesSearch;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, custodies, startDate, endDate, filterItemId, searchTerm, items]);

  const employeeClearanceData = useMemo(() => {
    if (!filterEmployeeId) return null;
    const emp = employees.find(e => e.id === filterEmployeeId);
    const empCustodies = custodies.filter(c => c.employeeId === filterEmployeeId);
    const summary: Record<string, any> = {};
    empCustodies.forEach(c => {
      const item = items.find(i => i.id === c.itemId);
      if (!item) return;
      const key = c.itemId;
      if (!summary[key]) summary[key] = { name: item.name, code: item.code, out: 0, in: 0, net: 0, returnsDetail: { NEW: 0, USED: 0, SCRAP: 0 } };
      if (c.type === 'HANDOVER') summary[key].out += c.quantity;
      else if (c.type === 'RETURN') {
        summary[key].in += c.quantity;
        if (c.state === 'NEW') summary[key].returnsDetail.NEW += c.quantity;
        else if (c.state === 'USED') summary[key].returnsDetail.USED += c.quantity;
        else if (c.state === 'SCRAP') summary[key].returnsDetail.SCRAP += c.quantity;
      }
      summary[key].net = summary[key].out - summary[key].in;
    });
    return { employee: emp, items: Object.values(summary).filter(i => i.out > 0) };
  }, [filterEmployeeId, custodies, items, employees]);

  const deadStockData = useMemo(() => {
    return items.map(item => {
      const itemMoves = movements.filter(m => m.itemId === item.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const lastMoveDate = itemMoves.length > 0 ? itemMoves[0].timestamp : item.createdAt;
      const daysSinceLastMove = Math.floor((new Date().getTime() - new Date(lastMoveDate).getTime()) / (1000 * 60 * 60 * 24));
      return { ...item, lastMoveDate, daysSinceLastMove, isDead: daysSinceLastMove >= 90 };
    }).filter(i => i.isDead).sort((a,b) => b.daysSinceLastMove - a.daysSinceLastMove);
  }, [items, movements]);

  const netConsumptionData = useMemo(() => {
    const report: Record<string, any> = {};
    const filteredMovements = movements.filter(m => {
      if (m.type !== 'OUTWARD') return false;
      const matchesDate = filterByDateRange(m.timestamp);
      const matchesItem = !filterItemId || m.itemId === filterItemId;
      const matchesEmployee = !filterEmployeeId || m.employeeId === filterEmployeeId;
      const matchesWarehouse = filterWarehouseId === 'ALL' || m.warehouseId === filterWarehouseId;
      return matchesDate && matchesItem && matchesEmployee && matchesWarehouse;
    });

    filteredMovements.forEach(m => {
      if (!report[m.itemId]) {
        const item = items.find(i => i.id === m.itemId);
        const lastInward = movements
          .filter(mov => mov.itemId === m.itemId && mov.type === 'INWARD' && mov.unitPrice)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
        report[m.itemId] = {
          id: m.itemId, 
          name: item?.name || 'مجهول', 
          code: item?.code || '-', 
          totalOut: 0, 
          totalReturns: 0,
          unitName: units.find(u => u.id === item?.unitId)?.name || '',
          lastPurchasePrice: lastInward?.unitPrice || item?.price || 0
        };
      }
      report[m.itemId].totalOut += m.quantity;
      report[m.itemId].totalReturns += m.returnedQuantity || 0;
    });

    return Object.values(report).map(row => ({
      ...row, 
      netQty: row.totalOut - row.totalReturns,
      finalPrice: customPrices[row.id] !== undefined ? customPrices[row.id] : row.lastPurchasePrice
    }));
  }, [movements, items, filterItemId, filterEmployeeId, filterWarehouseId, startDate, endDate, customPrices, units]);

  // --- أرشيف مرتجعات الصرف (فقط المرتجعات المرتبطة بحركات الصرف)
  const returnsArchive = useMemo(() => {
    const fromMovements = movements.filter(m => (m.returnedQuantity && m.returnedQuantity > 0) ).map(m => ({
      source: 'MOVEMENT',
      timestamp: m.timestamp,
      docNumber: m.returnDocNumber || `RET-${m.docNumber || ''}`,
      itemId: m.itemId,
      code: items.find(i => i.id === m.itemId)?.code || '-',
      name: items.find(i => i.id === m.itemId)?.name || '-',
      qty: m.returnedQuantity || 0,
      state: m.returnState || 'NEW',
      employee: employees.find(e => e.id === m.employeeId)?.name || m.performedBy || '-',
      note: m.note || `مرتجع متعلق بالسند ${m.docNumber || '-'}`
    }));

    const filtered = fromMovements.filter(r => {
      const matchesItem = !filterItemId || r.itemId === filterItemId;
      const matchesEmployee = !filterEmployeeId || r.employee === employees.find(e => e.id === filterEmployeeId)?.name;
      const entryDate = r.timestamp.split('T')[0];
      const matchesDate = (!startDate || entryDate >= startDate) && (!endDate || entryDate <= endDate);
      const matchesSearch = !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesItem && matchesEmployee && matchesDate && matchesSearch;
    });

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, items, employees, filterItemId, filterEmployeeId, startDate, endDate, searchTerm]);

  const totalConsumptionValue = useMemo(() => netConsumptionData.reduce((sum, row) => sum + (row.netQty * row.finalPrice), 0), [netConsumptionData]);

  // --- إجراءات الطباعة والتصدير ---
  const handleExport = () => {
    let rows: any[][] = [["الشركة العربية لصهر وتشكيل المعادن"], []];
    let fileName = "تقرير_العربية";

    if (activeReport === 'STOCK_LEDGER') {
      const item = items.find(i => i.id === filterItemId);
      fileName = `سجل_حركة_${item?.name || 'صنف'}`;
      rows[1] = ["تقرير سجل حركة صنف تفصيلي (Detailed Stock Ledger)"];
      rows.push(["بيان الصنف:", item?.name || '-', "الكود:", item?.code || '-']);
      rows.push(["التاريخ والوقت", "نوع المستند", "رقم السند", "وارد (+)", "منصرف (-)", "الرصيد التراكمي", "المسؤول", "البيان/الملاحظات"]);
      stockLedger.transactions.forEach(l => rows.push([formatDateTime(l.timestamp), l.actionName, l.docNumber, l.in || 0, l.out || 0, l.balance, l.user, l.note]));
    } else if (activeReport === 'NET_CONSUMPTION') {
      fileName = `تحليل_صافي_الاستهلاك`;
      rows[1] = ["تحليل صافي استهلاك الأصناف والمهمات"];
      rows.push(["باركود", "اسم الصنف", "الوحدة", "إجمالي المنصرف", "إجمالي المرتجع", "صافي الاستهلاك", "سعر الوحدة", "إجمالي القيمة"]);
      netConsumptionData.forEach(row => rows.push([row.code, row.name, row.unitName, Math.floor(row.totalOut), Math.floor(row.totalReturns), Math.floor(row.netQty), row.finalPrice.toFixed(2), (row.netQty * row.finalPrice).toFixed(2)]));
      rows.push(["", "", "", "", "", "", "إجمالي قيمة الاستهلاك:", totalConsumptionValue.toFixed(2)]);
    } else if (activeReport === 'INVENTORY_ARCHIVE') {
      fileName = `ارشيف_الجرد`;
      rows[1] = ["تقرير أرشيف الجرد والتسويات الجردية"];
      rows.push(["رقم", "الصنف", "الكود", "الوحدة", "التاريخ", "رقم السند", "الكمية", "الملاحظات"]);
      inventoryArchive.forEach((s: any, idx: number) => {
        const item = items.find(i => i.id === s.itemId);
        rows.push([
          idx + 1,
          item?.name || '-',
          item?.code || '-',
          units.find(u => u.id === item?.unitId)?.name || '-',
          formatDateTime(s.timestamp).split('T')[0],
          s.docNumber,
          s.quantity,
          s.note || '-'
        ]);
      });
    } else if (activeReport === 'EMPLOYEE_CLEARANCE') {
      if (!filterEmployeeId || !employeeClearanceData) return alert('اختر موظف أولاً');
      fileName = `كشف_ذمة_${employeeClearanceData?.employee?.name || 'موظف'}`;
      rows[1] = ["كشف ذمة الموظف (إخلاء طرف)"];
      rows.push(["الموظف:", employeeClearanceData?.employee?.name || '-', "الرقم:", employeeClearanceData?.employee?.id || '-']);
      rows.push([]);
      rows.push(["رقم", "الصنف", "الصرف (+)", "الاستلام (-)", "الذمة", "جديد", "مستعمل", "خردة"]);
      employeeClearanceData?.items.forEach((i: any, idx: number) => {
        rows.push([
          idx + 1,
          i.name,
          Math.floor(i.out),
          Math.floor(i.in),
          Math.floor(i.net),
          i.returnsDetail.NEW,
          i.returnsDetail.USED,
          i.returnsDetail.SCRAP
        ]);
      });
      const totalOut = employeeClearanceData?.items?.reduce((s: number, i: any) => s + i.out, 0) || 0;
      const totalDebt = employeeClearanceData?.items?.reduce((s: number, i: any) => s + i.net, 0) || 0;
      rows.push([]);
      rows.push(["الإجمالي", "إجمالي الأصناف المصروفة:", Math.floor(totalOut), "الذمة المتبقية:", Math.floor(totalDebt)]);
    } else if (activeReport === 'STOCK_ALERTS') {
      fileName = `تقرير_الركود_والنواقص`;
      rows[1] = ["تقرير الركود والنواقص (الأصناف الراكدة أكثر من 90 يوم)"];
      rows.push(["رقم", "الصنف", "الكود", "الكمية", "الوحدة", "آخر حركة", "أيام الركود", "الحالة"]);
      deadStockData.forEach((item: any, idx: number) => {
        rows.push([
          idx + 1,
          item.name,
          item.code,
          Math.floor(item.quantity),
          units.find(u => u.id === item.unitId)?.name || '-',
          formatDateTime(item.lastMoveDate).split('T')[0],
          item.daysSinceLastMove,
          item.daysSinceLastMove > 180 ? 'راكد جداً' : item.daysSinceLastMove > 90 ? 'راكد' : 'نسبي'
        ]);
      });
      if (deadStockData.length === 0) {
        rows.push(["", "لا توجد أصناف راكدة - مبروك!", "", "", "", "", "", ""]);
      }
    }
    
    exportToExcel(rows, fileName);
  };

  // --- طباعة وتصدير تقرير المرتجعات ---
  const handleExportReturns = () => {
    const rows: any[][] = [["أرشيف مرتجعات الصرف"], []];
    rows[1] = ["تقرير أرشيف المرتجعات (مرتجعات صرف)"];
    rows.push(["التاريخ والوقت","مصدر","رقم السند","كود الصنف","اسم الصنف","الكمية","الحالة","الموظف","الملاحظات"]);
    returnsArchive.forEach(r => rows.push([formatDateTime(r.timestamp), r.source, r.docNumber, r.code, r.name, r.qty, r.state, r.employee, r.note]));
    exportToExcel(rows, 'ارشيف_المرتجعات');
  };

  const handlePrintReturns = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rowsHtml = returnsArchive.map(r => `
      <tr>
        <td style="font-size:11px">${formatDateTime(r.timestamp)}</td>
        <td>${r.source}</td>
        <td style="font-family:monospace">${r.docNumber}</td>
        <td>${r.code}</td>
        <td>${r.name}</td>
        <td style="text-align:center">${r.qty}</td>
        <td>${r.state}</td>
        <td>${r.employee}</td>
        <td style="font-size:11px">${r.note}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html dir="rtl"><head><title>أرشيف المرتجعات</title>
        <style>body{font-family: Arial, Helvetica, sans-serif; direction: rtl;}
        table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px;font-size:12px}
        th{background:#f3f4f6}
        </style>
      </head><body>
        <h3>أرشيف مرتجعات الصرف</h3>
        <table>
          <thead>
            <tr><th>التاريخ</th><th>المصدر</th><th>رقم السند</th><th>كود</th><th>اسم الصنف</th><th>الكمية</th><th>الحالة</th><th>الموظف</th><th>الملاحظات</th></tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body></html>
    `);

    printWindow.document.close();
    // If running inside Electron, use IPC print helper
    try {
      const { ipcRenderer } = (window as any).require ? (window as any).require('electron') : { ipcRenderer: null };
      if (ipcRenderer && ipcRenderer.invoke) {
        // give the window a moment to render
        setTimeout(() => {
          ipcRenderer.invoke('print', {silent: false, printBackground: true});
          setTimeout(() => printWindow.close(), 500);
        }, 300);
        return;
      }
    } catch (e) {
      // ignore
    }

    // fallback browser print
    printWindow.onload = () => { printWindow.print(); setTimeout(() => printWindow.close(), 500); };
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('تم حجب النافذة المنبثقة. يرجى السماح بفتح نوافذ منبثقة');
    let content = '';
    let reportTitle = '';
    
    // Determine report content based on active report
    if (activeReport === 'STOCK_LEDGER') {
        if (!filterItemId) return alert('اختر صنف أولاً');
        const item = items.find(i => i.id === filterItemId);
        const rows = stockLedger.transactions.map(l => `
          <tr>
            <td style="font-size:10px; padding:6px">${formatDateTime(l.timestamp)}</td>
            <td style="padding:6px">${l.actionName}</td>
            <td style="font-family:monospace; padding:6px">${l.docNumber}</td>
            <td style="color:green; font-weight:bold; padding:6px; text-align:center">${l.in || '-'}</td>
            <td style="color:red; font-weight:bold; padding:6px; text-align:center">${l.out || '-'}</td>
            <td style="font-weight:900; background:#f8fafc; padding:6px; text-align:center">${l.balance}</td>
            <td style="font-size:10px; padding:6px">${l.user}</td>
            <td style="text-align:right; font-size:10px; padding:6px">${l.note}</td>
          </tr>
        `).join('');
        reportTitle = 'سجل حركة صنف تفصيلي';
        content = `
          <div style="text-align:center; border-bottom:4px double #000; padding-bottom:15px; margin-bottom:20px;">
            <h1 style="margin:0; font-size:20px"><b>${reportTitle}</b></h1>
            <h2 style="margin:5px 0; font-size:14px">الشركة العربية لصهر وتشكيل المعادن</h2>
            <div style="margin-top:10px; font-size:12px">
              <b>الصنف:</b> ${item?.name} | <b>الكود:</b> ${item?.code} | <b>الوحدة:</b> ${units.find(u => u.id === item?.unitId)?.name || ''}<br/>
              <b>الفترة:</b> ${startDate || 'من البداية'} إلی: ${endDate || 'اليوم'}
            </div>
          </div>
          <table border="1" style="width:100%; border-collapse:collapse; text-align:center; font-size:11px">
            <thead>
              <tr style="background:#e5e7eb; font-weight:bold">
                <th>التاريخ</th>
                <th>نوع المستند</th>
                <th>رقم السند</th>
                <th>الوارد (+)</th>
                <th>المنصرف (-)</th>
                <th>الرصيد النهائي</th>
                <th>المسؤول</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="8" style="padding:20px; color:red">لا توجد بيانات للفترة المحددة</td></tr>'}</tbody>
            <tfoot>
              <tr style="background:#f3f4f6; font-weight:bold; border-top:2px solid #000">
                <td colspan="3" style="padding:8px">الإجماليات للفترة</td>
                <td style="color:green; padding:8px">${stockLedger.totals.in}</td>
                <td style="color:red; padding:8px">${stockLedger.totals.out}</td>
                <td colspan="3" style="padding:8px">الرصيد الختامي: <b>${stockLedger.totals.final}</b></td>
              </tr>
            </tfoot>
          </table>
        `;

    } else if (activeReport === 'NET_CONSUMPTION') {
        const rows = netConsumptionData.map(row => `
          <tr>
            <td style="font-family:monospace; padding:6px; font-size:11px">${row.code}</td>
            <td style="text-align:right; padding:6px"><b>${row.name}</b></td>
            <td style="padding:6px; font-size:11px">${row.unitName}</td>
            <td style="padding:6px; text-align:center">${Math.floor(row.totalOut)}</td>
            <td style="color:#d97706; padding:6px; text-align:center; font-weight:bold">${Math.floor(row.totalReturns)}</td>
            <td style="font-weight:bold; color:#2563eb; padding:6px; text-align:center">${Math.floor(row.netQty)}</td>
            <td style="padding:6px; text-align:center; font-size:11px">${row.finalPrice.toFixed(2)}</td>
            <td style="font-weight:bold; padding:6px; text-align:center">${(row.netQty * row.finalPrice).toFixed(2)}</td>
          </tr>
        `).join('');
        reportTitle = 'صافي الاستهلاك (الكمي والمالي)';
        content = `
          <div style="text-align:center; border-bottom:4px double #000; padding:15px 0; margin-bottom:20px;">
            <h1 style="margin:0; font-size:20px"><b>${reportTitle}</b></h1>
            <h2 style="margin:5px 0; font-size:14px">الشركة العربية لصهر وتشكيل المعادن</h2>
            <div style="margin-top:10px; font-size:12px">
              <b>الفترة المشمولة:</b> من <b>${startDate || 'البداية'}</b> إلی <b>${endDate || 'اليوم'}</b>
            </div>
          </div>
          <table border="1" style="width:100%; border-collapse:collapse; text-align:center; font-size:11px">
            <thead>
              <tr style="background:#e5e7eb; font-weight:bold">
                <th style="padding:8px">الباركود</th>
                <th style="padding:8px">اسم الصنف</th>
                <th style="padding:8px">الوحدة</th>
                <th style="padding:8px">الصرف (كم)</th>
                <th style="padding:8px">المرتجع (كم)</th>
                <th style="padding:8px">صافي المستهلك</th>
                <th style="padding:8px">السعر</th>
                <th style="padding:8px">الإجمالي (ج.م)</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="8" style="padding:20px; color:red">لا توجد بيانات</td></tr>'}</tbody>
            <tfoot>
              <tr style="background:#f3f4f6; font-weight:bold; border-top:2px solid #000">
                <td colspan="7" style="text-align:left; padding:10px">إجمالي قيمة الاستهلاك:</td>
                <td style="font-size:13px; color:#1e40af; padding:10px"><b>${totalConsumptionValue.toFixed(2)} ج.م</b></td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:60px; display:flex; justify-content:space-around; font-weight:bold; text-align:center; font-size:12px">
            <div style="width:25%">أمين المخزن<br/><br/>..................</div>
            <div style="width:25%">المحاسب<br/><br/>..................</div>
            <div style="width:25%">المراجع<br/><br/>..................</div>
            <div style="width:25%">المدير العام<br/><br/>..................</div>
          </div>
        `;

    } else if (activeReport === 'INVENTORY_ARCHIVE') {
        const rows = inventoryArchive.map((s: any, idx: number) => {
          const item = items.find(i => i.id === s.itemId);
          return `
            <tr>
              <td style="padding:6px; font-size:11px">${idx + 1}</td>
              <td style="padding:6px"><b>${item?.name}</b></td>
              <td style="padding:6px; font-family:monospace">${item?.code}</td>
              <td style="padding:6px; text-align:center">${units.find(u => u.id === item?.unitId)?.name || ''}</td>
              <td style="padding:6px; text-align:center">${formatDateTime(s.timestamp).split('T')[0]}</td>
              <td style="padding:6px; text-align:center">${s.docNumber}</td>
              <td style="padding:6px; color:${s.note?.includes('زيادة') ? 'green' : 'red'}; font-weight:bold">${s.quantity}</td>
              <td style="padding:6px; font-size:11px">${s.note || '-'}</td>
            </tr>
          `;
        }).join('');
        reportTitle = 'تقرير أرشيف الجرد والتسويات';
        content = `
          <div style="text-align:center; border-bottom:4px double #000; padding:15px 0; margin-bottom:20px;">
            <h1 style="margin:0; font-size:20px"><b>${reportTitle}</b></h1>
            <h2 style="margin:5px 0; font-size:14px">الشركة العربية لصهر وتشكيل المعادن</h2>
            <div style="margin-top:10px; font-size:12px">
              <b>الفترة:</b> من <b>${startDate || 'البداية'}</b> إلی <b>${endDate || 'اليوم'}</b>
            </div>
          </div>
          <table border="1" style="width:100%; border-collapse:collapse; text-align:center; font-size:11px">
            <thead>
              <tr style="background:#e5e7eb; font-weight:bold">
                <th style="padding:8px">#</th>
                <th style="padding:8px">الصنف</th>
                <th style="padding:8px">الكود</th>
                <th style="padding:8px">الوحدة</th>
                <th style="padding:8px">التاريخ</th>
                <th style="padding:8px">رقم السند</th>
                <th style="padding:8px">الكمية</th>
                <th style="padding:8px">الملاحظات</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="8" style="padding:20px; color:red">لا توجد تسويات جردية</td></tr>'}</tbody>
          </table>
        `;

    } else if (activeReport === 'EMPLOYEE_CLEARANCE') {
        if (!filterEmployeeId || !employeeClearanceData) return alert('اختر موظف أولاً');
        const rows = employeeClearanceData.items.map((i: any, idx: number) => `
          <tr>
            <td style="padding:6px; font-size:11px">${idx + 1}</td>
            <td style="padding:6px"><b>${i.name}</b></td>
            <td style="padding:6px; text-align:center; font-weight:bold; color:#d97706">${Math.floor(i.out)}</td>
            <td style="padding:6px; text-align:center; font-weight:bold; color:#059669">${Math.floor(i.in)}</td>
            <td style="padding:6px; text-align:center; font-weight:bold; color:#dc2626">${Math.floor(i.net)}</td>
            <td style="padding:6px; text-align:center">${i.returnsDetail.NEW}</td>
            <td style="padding:6px; text-align:center">${i.returnsDetail.USED}</td>
            <td style="padding:6px; text-align:center">${i.returnsDetail.SCRAP}</td>
          </tr>
        `).join('');
        reportTitle = 'كشف ذمة الموظف (إخلاء طرف)';
        content = `
          <div style="text-align:center; border-bottom:4px double #000; padding:15px 0; margin-bottom:20px;">
            <h1 style="margin:0; font-size:20px"><b>${reportTitle}</b></h1>
            <h2 style="margin:5px 0; font-size:14px">الشركة العربية لصهر وتشكيل المعادن</h2>
            <div style="margin-top:10px; font-size:13px">
              <b>الموظف:</b> <span style="color:#0369a1; font-weight:bold">${employeeClearanceData?.employee?.name}</span>
              <span style="margin:0 20px">|</span>
              <b>الرقم الوظيفي:</b> ${employeeClearanceData?.employee?.id}
            </div>
          </div>
          <table border="1" style="width:100%; border-collapse:collapse; text-align:center; font-size:11px">
            <thead>
              <tr style="background:#e5e7eb; font-weight:bold">
                <th style="padding:8px">#</th>
                <th style="padding:8px">الصنف</th>
                <th style="padding:8px; color:#d97706">الصرف (+)</th>
                <th style="padding:8px; color:#059669">الاستلام (-)</th>
                <th style="padding:8px; color:#dc2626">الذمة</th>
                <th style="padding:8px">جديد</th>
                <th style="padding:8px">مستعمل</th>
                <th style="padding:8px">خردة</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="background:#f3f4f6; font-weight:bold; border-top:2px solid #000">
                <td colspan="2" style="padding:10px; text-align:left">إجمالي الأصناف المصروفة:</td>
                <td style="padding:10px">${employeeClearanceData?.items?.reduce((s: number, i: any) => s + i.out, 0) || 0}</td>
                <td colspan="5" style="padding:10px">الذمة المتبقية: <b style="color:#dc2626">${employeeClearanceData?.items?.reduce((s: number, i: any) => s + i.net, 0) || 0}</b></td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:50px; text-align:center; font-weight:bold">
            <p>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
            <div style="display:flex; justify-content:space-around; margin-top:40px; font-size:12px">
              <div style="width:30%">توقيع الموظف<br/><br/>..................</div>
              <div style="width:30%">أمين المخزن<br/><br/>..................</div>
              <div style="width:30%">المدير<br/><br/>..................</div>
            </div>
          </div>
        `;

    } else if (activeReport === 'STOCK_ALERTS') {
        const rows = deadStockData.map((item: any, idx: number) => `
          <tr>
            <td style="padding:6px; font-size:11px">${idx + 1}</td>
            <td style="padding:6px"><b>${item.name}</b></td>
            <td style="padding:6px; font-family:monospace">${item.code}</td>
            <td style="padding:6px; text-align:center">${Math.floor(item.quantity)}</td>
            <td style="padding:6px; text-align:center">${units.find(u => u.id === item.unitId)?.name || ''}</td>
            <td style="padding:6px; text-align:center; font-size:11px">${formatDateTime(item.lastMoveDate).split('T')[0]}</td>
            <td style="padding:6px; text-align:center; font-weight:bold; color:${item.daysSinceLastMove > 180 ? '#dc2626' : '#d97706'}">${item.daysSinceLastMove} يوم</td>
            <td style="padding:6px; font-size:11px">${item.daysSinceLastMove > 180 ? '🔴 راكد جداً' : item.daysSinceLastMove > 90 ? '🟠 راكد' : '🟡 نسبي'}</td>
          </tr>
        `).join('');
        reportTitle = 'تقرير الركود والنواقص';
        content = `
          <div style="text-align:center; border-bottom:4px double #000; padding:15px 0; margin-bottom:20px;">
            <h1 style="margin:0; font-size:20px"><b>${reportTitle}</b></h1>
            <h2 style="margin:5px 0; font-size:14px">الشركة العربية لصهر وتشكيل المعادن</h2>
            <div style="margin-top:10px; font-size:12px">
              <b>التقرير يشمل الأصناف التي لم يتم تحريكها لمدة 90 يوم فأكثر</b>
            </div>
          </div>
          <table border="1" style="width:100%; border-collapse:collapse; text-align:center; font-size:11px">
            <thead>
              <tr style="background:#e5e7eb; font-weight:bold">
                <th style="padding:8px">#</th>
                <th style="padding:8px">الصنف</th>
                <th style="padding:8px">الكود</th>
                <th style="padding:8px">الكمية</th>
                <th style="padding:8px">الوحدة</th>
                <th style="padding:8px">آخر حركة</th>
                <th style="padding:8px">أيام الركود</th>
                <th style="padding:8px">الحالة</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="8" style="padding:20px; color:green">مبروك! لا توجد أصناف راكدة</td></tr>'}</tbody>
          </table>
        `;

    } else if (activeReport === 'RETURNS_ARCHIVE') {
        // This is handled by handlePrintReturns, so skip
        return handlePrintReturns();
    }

    if (!content) return;

    // Write HTML document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${reportTitle} - الشركة العربية</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap&subset=arabic');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Cairo', 'Arial', sans-serif;
              padding: 20px 40px;
              background: white;
              color: #000;
              line-height: 1.6;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px;
              table-layout: fixed;
            }
            th, td { 
              padding: 8px;
              border: 1px solid #333;
              font-size: 11px;
            }
            th { 
              background: #e5e7eb;
              font-weight: bold;
              text-align: center;
            }
            tfoot tr {
              border-top: 2px solid #000;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              page { size: A4; margin: 10mm; }
            }
            .print-footer {
              margin-top: 30px;
              border-top: 1px solid #ccc;
              padding-top: 15px;
              font-size: 10px;
              text-align: center;
              color: #666;
            }
          </style>
        </head>
        <body>
          ${content}
          <div class="print-footer">
            تم الطباعة بواسطة: نظام إدارة المخازن الاحترافي v4.0.0 | التاريخ: ${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString('ar-EG')}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-[1700px] mx-auto space-y-10 animate-in fade-in duration-500 pb-20 font-['Cairo']">
      
      {/* Tabs Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-6">
          <div className="p-6 bg-gradient-to-br from-indigo-600 to-blue-900 text-white rounded-[2.5rem] shadow-2xl">
            <Calculator size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white">مركز التقارير المتطور</h2>
            <p className="text-slate-400 font-bold mt-1 tracking-tight">الشركة العربية لصهر وتشكيل المعادن</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-800/50 p-2 rounded-[2rem] border border-slate-700 shadow-inner">
           {[
             { id: 'STOCK_LEDGER', label: 'سجل حركة صنف', icon: <History size={16}/> },
             { id: 'NET_CONSUMPTION', label: 'صافي الاستهلاك', icon: <ShoppingBag size={16}/> },
             { id: 'INVENTORY_ARCHIVE', label: 'أرشيف الجرد', icon: <ClipboardList size={16}/> },
             { id: 'EMPLOYEE_CLEARANCE', label: 'إخلاء طرف', icon: <UserMinus size={16}/> },
                { id: 'STOCK_ALERTS', label: 'الركود والنواقص', icon: <AlertTriangle size={16}/> },
                { id: 'RETURNS_ARCHIVE', label: 'أرشيف المرتجعات', icon: <RotateCcw size={16}/> },
           ].map(tab => (
             <button key={tab.id} onClick={() => setActiveReport(tab.id as ReportType)} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 ${activeReport === tab.id ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'}`}>
               {tab.icon} {tab.label}
             </button>
           ))}
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-[#1e293b] p-8 rounded-[3.5rem] border border-slate-700/50 shadow-2xl space-y-6 no-print">
         <div className="flex flex-wrap items-end gap-6">
            <div className="flex-1 min-w-[280px] space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Package size={14} className="text-indigo-400"/> بحث ذكي بالأصناف</label>
                <select value={filterItemId} onChange={(e) => setFilterItemId(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-3.5 px-6 font-black text-white outline-none focus:border-indigo-500/50">
                  <option value="">-- اختر صنف للمعاينة --</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
                </select>
            </div>

            <div className="min-w-[220px] space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><User size={14} className="text-indigo-400"/> اختر موظف</label>
                <select value={filterEmployeeId} onChange={(e) => setFilterEmployeeId(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-3.5 px-6 font-black text-white outline-none">
                  <option value="">-- اختر موظف --</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
            </div>

            {activeReport === 'STOCK_LEDGER' && (
              <div className="w-[150px] space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">فلترة الحالة</label>
                  <select value={filterState} onChange={(e) => setFilterState(e.target.value as any)} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl py-3.5 px-4 font-black text-white outline-none">
                    <option value="ALL">الكل</option>
                    <option value="NEW">جديد</option>
                    <option value="USED">مستعمل</option>
                    <option value="SCRAP">هالك</option>
                  </select>
              </div>
            )}

            <div className="flex items-end gap-3 bg-slate-900/40 p-4 rounded-3xl border border-slate-800/50 group">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-sky-400 mr-2 uppercase block">من تاريخ:</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-900 border-2 border-slate-800 rounded-xl py-2 px-3 text-white font-black text-xs" />
                </div>
                <div className="pb-3 text-slate-600 px-1"><ArrowRight size={16} /></div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-sky-400 mr-2 uppercase block">إلى تاريخ:</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-900 border-2 border-slate-800 rounded-xl py-2 px-3 text-white font-black text-xs" />
                </div>
            </div>

            <div className="flex gap-3">
                {activeReport === 'RETURNS_ARCHIVE' ? (
                  <>
                    <button onClick={handlePrintReturns} className="bg-white text-black font-black py-4 px-8 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-slate-100 transition-all border-2 border-slate-200 active:scale-95"><Printer size={20}/> طباعة الأرشيف</button>
                    <button onClick={handleExportReturns} className="bg-emerald-600 text-white font-black py-4 px-8 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-emerald-500 transition-all active:scale-95"><FileSpreadsheet size={20}/> تصدير Excel</button>
                  </>
                ) : (
                  <>
                    <button onClick={handlePrint} className="bg-white text-black font-black py-4 px-8 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-slate-100 transition-all border-2 border-slate-200 active:scale-95"><Printer size={20}/> طباعة التقرير</button>
                    <button onClick={handleExport} className="bg-emerald-600 text-white font-black py-4 px-8 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-emerald-500 transition-all active:scale-95"><FileSpreadsheet size={20}/> تصدير Excel</button>
                  </>
                )}
            </div>
         </div>
      </div>

      {/* Main Report View */}
      <div className="min-h-[500px]">
        {activeReport === 'STOCK_LEDGER' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            {!filterItemId ? (
              <div className="bg-slate-800/30 p-24 rounded-[3.5rem] border-2 border-dashed border-slate-700 text-center">
                <Calculator size={64} className="mx-auto text-slate-700 mb-6" />
                <h3 className="text-2xl font-black text-slate-400">يرجى اختيار صنف من القائمة العلوية لبناء سجل الحركة التفصيلي</h3>
              </div>
            ) : (
              <div className="bg-[#1e293b]/80 backdrop-blur-md rounded-[3.5rem] border border-slate-700/50 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-700/50 bg-indigo-500/5 flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><History size={28}/></div>
                      <div>
                         <h3 className="text-2xl font-black text-white">{items.find(i => i.id === filterItemId)?.name}</h3>
                         <p className="text-xs font-bold text-slate-500">كود الصنف: <span className="font-mono text-indigo-400">{items.find(i => i.id === filterItemId)?.code}</span></p>
                      </div>
                   </div>
                   <div className="flex gap-6">
                      <div className="text-center">
                         <p className="text-[10px] font-black text-slate-500 uppercase">وارد للفترة</p>
                         <p className="text-2xl font-black text-emerald-400">{stockLedger.totals.in}</p>
                      </div>
                      <div className="text-center">
                         <p className="text-[10px] font-black text-slate-500 uppercase">منصرف للفترة</p>
                         <p className="text-2xl font-black text-rose-400">{stockLedger.totals.out}</p>
                      </div>
                      <div className="text-center bg-slate-900 px-6 py-2 rounded-2xl border border-slate-800">
                         <p className="text-[10px] font-black text-indigo-400 uppercase">الرصيد الختامي</p>
                         <p className="text-2xl font-black text-white">{stockLedger.totals.final}</p>
                      </div>
                   </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase border-b border-slate-700">
                        <th className="px-8 py-6">التاريخ والوقت</th>
                        <th className="px-8 py-6">نوع المستند</th>
                        <th className="px-8 py-6 text-center">رقم السند</th>
                        <th className="px-8 py-6 text-center text-emerald-500">الوارد (+)</th>
                        <th className="px-8 py-6 text-center text-rose-500">منصرف (-)</th>
                        <th className="px-8 py-6 text-center text-indigo-400 bg-indigo-500/5">الرصيد التراكمي</th>
                        <th className="px-8 py-6">المسؤول</th>
                        <th className="px-8 py-6">البيان/الملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {stockLedger.transactions.map((l, idx) => (
                        <tr key={idx} className={`hover:bg-slate-800/40 transition-all ${l.docNumber === 'منقول' || l.docNumber === 'OPEN-INV' ? 'bg-slate-900/50 italic' : ''}`}>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-100">{formatDateTime(l.timestamp).split(' ')[0]}</span>
                              <span className="text-[9px] text-slate-500 font-bold">{formatDateTime(l.timestamp).split(' ').slice(1).join(' ')}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                             <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${
                               l.in > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                               l.out > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                               'bg-slate-800 text-slate-400 border-slate-700'
                             }`}>
                               {l.actionName}
                             </span>
                          </td>
                          <td className="px-8 py-6 text-center font-mono text-xs text-sky-400 font-black">{l.docNumber}</td>
                          <td className="px-8 py-6 text-center font-black text-emerald-500 text-xl">{l.in || '--'}</td>
                          <td className="px-8 py-6 text-center font-black text-rose-500 text-xl">{l.out || '--'}</td>
                          <td className="px-8 py-6 text-center font-black text-white text-2xl bg-indigo-500/5 border-x border-indigo-500/10">{l.balance}</td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-1.5">
                                <UserCheck size={12} className="text-slate-600" />
                                <span className="text-[10px] text-slate-400 font-black">{l.user}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-xs font-bold text-slate-500 max-w-[200px] truncate" title={l.note}>{l.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeReport === 'NET_CONSUMPTION' && (
           <div className="animate-in fade-in duration-500 space-y-6">
              <div className="bg-[#1e293b]/80 rounded-[3.5rem] border border-slate-700/50 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-700/50 bg-emerald-500/5 flex justify-between items-center">
                   <h3 className="text-2xl font-black text-white flex items-center gap-3"><ShoppingBag className="text-emerald-400" /> تحليل صافي الاستهلاك المالي والكمي</h3>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase">إجمالي تكلفة الاستهلاك:</span>
                      <span className="text-3xl font-black text-emerald-400">{totalConsumptionValue.toLocaleString()} <small className="text-xs">ج.م</small></span>
                   </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase border-b border-slate-700">
                        <th className="px-8 py-6">كود الصنف</th>
                        <th className="px-8 py-6">اسم الصنف</th>
                        <th className="px-8 py-6">الوحدة</th>
                        <th className="px-8 py-6 text-center">إجمالي المنصرف</th>
                        <th className="px-8 py-6 text-center text-amber-500">المرتجع</th>
                        <th className="px-8 py-6 text-center text-sky-400 bg-sky-500/5">صافي الاستهلاك</th>
                        <th className="px-8 py-6 text-center">سعر الوحدة</th>
                        <th className="px-8 py-6 text-center bg-emerald-500/5">التكلفة الإجمالية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {netConsumptionData.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-800/40 transition-all">
                          <td className="px-8 py-6 font-mono text-xs text-slate-400">{row.code}</td>
                          <td className="px-8 py-6 font-black text-slate-100">{row.name}</td>
                          <td className="px-8 py-6 text-xs text-slate-500">{row.unitName}</td>
                          <td className="px-8 py-6 text-center font-bold">{row.totalOut}</td>
                          <td className="px-8 py-6 text-center font-bold text-amber-500">{row.totalReturns}</td>
                          <td className="px-8 py-6 text-center font-black text-xl text-sky-400 bg-sky-500/5">{row.netQty}</td>
                          <td className="px-8 py-6 text-center">
                             <input type="number" value={row.finalPrice} onChange={(e) => setCustomPrices({...customPrices, [row.id]: parseFloat(e.target.value) || 0})}
                                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-center font-black text-emerald-400 outline-none focus:ring-1 focus:ring-emerald-500" />
                          </td>
                          <td className="px-8 py-6 text-center font-black text-2xl text-white bg-emerald-500/5">{(row.netQty * row.finalPrice).toLocaleString()}</td>
                        </tr>
                      ))}
                      {netConsumptionData.length === 0 && (
                        <tr><td colSpan={8} className="py-24 text-center text-slate-700 font-black text-2xl italic opacity-30">لا توجد بيانات سحب مسجلة للفترة المحددة</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
           </div>
        )}

        {activeReport === 'RETURNS_ARCHIVE' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="bg-[#1e293b]/80 rounded-[3.5rem] border border-slate-700/50 shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-700/50 bg-indigo-500/5 flex justify-between items-center">
                <h3 className="text-2xl font-black text-white flex items-center gap-3"><RotateCcw className="text-indigo-400" /> أرشيف مرتجعات الصرف</h3>
                <div className="text-sm text-slate-400">عدد السجلات: <span className="font-black text-white">{returnsArchive.length}</span></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase border-b border-slate-700">
                      <th className="px-6 py-4">التاريخ</th>
                      <th className="px-6 py-4">رقم السند</th>
                      <th className="px-6 py-4">كود</th>
                      <th className="px-6 py-4">اسم الصنف</th>
                      <th className="px-6 py-4">الكمية</th>
                      <th className="px-6 py-4">الحالة</th>
                      <th className="px-6 py-4">الموظف</th>
                      <th className="px-6 py-4">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {returnsArchive.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-all">
                        <td className="px-6 py-4 text-[11px] font-black">{formatDateTime(r.timestamp)}</td>
                        <td className="px-6 py-4 font-mono text-sky-400">{r.docNumber}</td>
                        <td className="px-6 py-4 font-mono text-slate-300">{r.code}</td>
                        <td className="px-6 py-4 font-black text-white">{r.name}</td>
                        <td className="px-6 py-4 text-center font-black text-rose-400">{r.qty}</td>
                        <td className="px-6 py-4">{r.state}</td>
                        <td className="px-6 py-4">{r.employee}</td>
                        <td className="px-6 py-4 text-xs text-slate-500" title={r.note}>{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeReport === 'EMPLOYEE_CLEARANCE' && (
          <div className="animate-in fade-in duration-500">
             {!filterEmployeeId ? (
               <div className="bg-slate-800/30 p-24 rounded-[3.5rem] border-2 border-dashed border-slate-700 text-center"><UserMinus size={64} className="mx-auto text-slate-700 mb-6" /><h3 className="text-2xl font-black text-slate-400">اختر موظفاً لإصدار كشف عُهد وإخلاء طرف نهائي</h3></div>
             ) : (
               <div className="bg-[#1e293b]/80 rounded-[3.5rem] border border-slate-700/50 p-12 shadow-2xl">
                  <h3 className="text-3xl font-black text-white mb-10 pb-6 border-b border-slate-800">كشف ذمة الموظف: {employeeClearanceData?.employee?.name}</h3>
                  <table className="w-full text-right border-separate border-spacing-y-3">
                    <thead><tr className="text-slate-500 text-[10px] font-black uppercase text-center"><th className="px-4 py-2 text-right">الصنف والمعدة</th><th className="px-4 py-2 bg-slate-800/50">إجمالي المسلم</th><th className="px-4 py-2 text-emerald-400">مرتجع جديد</th><th className="px-4 py-2 text-sky-400">مرتجع مستعمل</th><th className="px-4 py-2 text-rose-400">مرتجع هالك</th><th className="px-4 py-2 bg-rose-500/10 text-rose-500">الصافي المتبقي بالذمة</th></tr></thead>
                    <tbody>{employeeClearanceData?.items.map((i, idx) => (<tr key={idx} className="bg-slate-900/40 hover:bg-slate-800"><td className="p-5 font-black text-slate-100">{i.name}</td><td className="p-5 text-center font-black text-slate-200">{Math.floor(i.out)}</td><td className="p-5 text-center font-bold text-emerald-500">{i.returnsDetail.NEW}</td><td className="p-5 text-center font-bold text-sky-500">{i.returnsDetail.USED}</td><td className="p-5 text-center font-bold text-rose-500">{i.returnsDetail.SCRAP}</td><td className="p-5 text-center"><span className={`px-5 py-2 rounded-xl text-2xl font-black ${i.net > 0 ? 'bg-rose-500 text-white shadow-lg' : 'bg-emerald-500/10 text-emerald-500'}`}>{Math.floor(i.net)}</span></td></tr>))}</tbody>
                  </table>
               </div>
             )}
          </div>
        )}

        {activeReport === 'INVENTORY_ARCHIVE' && (
           <div className="bg-[#1e293b]/80 backdrop-blur-md rounded-[3.5rem] border border-slate-700/50 shadow-2xl overflow-hidden animate-in fade-in">
                <table className="w-full text-right">
                    <thead><tr className="bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase border-b border-slate-700"><th className="px-8 py-6">تاريخ التسوية</th><th className="px-8 py-6">رقم المحضر الرسمي</th><th className="px-8 py-6">بيان الصنف</th><th className="px-8 py-6">نطاق الجرد</th><th className="px-8 py-6 text-center">الفرق المكتشف</th><th className="px-8 py-6">المسؤول عن الاعتماد</th></tr></thead>
                    <tbody className="divide-y divide-slate-800">
                        {inventoryArchive.map((s, idx) => {
                            const item = items.find(i => i.id === s.itemId);
                            const isSurplus = s.note?.includes('زيادة');
                            return (
                                <tr key={idx} className="hover:bg-slate-800/40 transition-all">
                                    <td className="px-8 py-6 text-xs text-slate-400">{formatDateTime(s.timestamp)}</td>
                                    <td className="px-8 py-6 font-mono text-xs text-indigo-400 font-black">{s.docNumber}</td>
                                    <td className="px-8 py-6 font-black text-slate-100">{item?.name}</td>
                                    <td className="px-8 py-6 text-[10px] font-bold text-slate-500">{s.source === 'CUSTODY' ? 'ذمة موظف' : 'رصيد مخزن'}</td>
                                    <td className="px-8 py-6 font-black text-2xl text-center">
                                       <span className={isSurplus ? 'text-emerald-500' : 'text-rose-500'}>{isSurplus ? '+' : '-'}{Math.floor(s.quantity)}</span>
                                    </td>
                                    <td className="px-8 py-6 text-xs font-bold text-slate-500">@{s.performedBy}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
           </div>
        )}

        {activeReport === 'STOCK_ALERTS' && (
          <div className="space-y-12 animate-in zoom-in-95 duration-500">
             <div className="bg-[#1e293b]/80 backdrop-blur-md rounded-[3.5rem] border-2 border-rose-500/20 shadow-2xl p-10">
                <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-700/30">
                  <h3 className="text-3xl font-black text-rose-500 flex items-center gap-4 uppercase tracking-tighter">
                     <ShieldCheck size={40}/> الأصناف الراكدة
                  </h3>
                </div>
                {deadStockData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {deadStockData.map(i => (
                      <div key={i.id} className="p-6 bg-slate-900/50 rounded-3xl border border-slate-800 flex flex-col justify-between group hover:border-rose-500/40 transition-all relative overflow-hidden">
                         <div className="mb-4">
                           <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{i.code}</p>
                           <p className="text-xl font-black text-slate-100 group-hover:text-rose-400 transition-colors">{i.name}</p>
                         </div>
                         <div className="mt-6 space-y-4 pt-4 border-t border-slate-800/50">
                            <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase">آخر حركة سحب:</span><span className="text-xs font-bold text-slate-300">{formatDateTime(i.lastMoveDate).split(' ')[0]}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase">مدة الركود:</span><span className="text-2xl font-black text-rose-500">{i.daysSinceLastMove} <small className="text-[10px] text-slate-500 uppercase">يوم</small></span></div>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-slate-600 italic font-black text-2xl opacity-20">لا توجد أصناف راكدة حالياً</div>
                )}
             </div>
          </div>
        )}
      </div>
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ReportsView;
