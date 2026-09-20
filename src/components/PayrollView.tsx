import React, { useState, useMemo } from 'react';
import {
  Coins,
  Boxes,
  MinusCircle,
  PlusCircle,
  CheckCircle2,
  Calculator,
  Search,
  Filter,
  User,
  Car,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { Order, InventoryItem, OrderWorkItem, Client, Vehicle } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';
import { calculateWorkItemSalary } from '../lib/salary';

interface PayrollViewProps {
  orders: Order[];
  clients: Client[];
  vehicles: Vehicle[];
  inventory: InventoryItem[];
  onDeductInventory: (itemId: string, amount: number, notes?: string) => void;
  onSelectOrder?: (order: Order) => void;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  orders,
  clients,
  vehicles,
  inventory,
  onDeductInventory,
  onSelectOrder,
}) => {
  // --- Helper maps for fast name/car lookup ---
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  // --- State for Inventory Deduction Section ---
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [deductQuantity, setDeductQuantity] = useState<string>('');
  const [deductNotes, setDeductNotes] = useState<string>('');
  const [deductSuccessMessage, setDeductSuccessMessage] = useState<string | null>(null);

  // --- State for Salary Calculation Section ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Interactive Single Item Calculator (for quick custom calculations)
  const [calcWorkTitle, setCalcWorkTitle] = useState('Бампер передній');
  const [calcWorkPrice, setCalcWorkPrice] = useState<string>('10000');
  const [calcMaterialCost, setCalcMaterialCost] = useState<string>('4000');

  const selectedInventoryItem = useMemo(() => {
    return inventory.find((i) => i.id === selectedInventoryId) || null;
  }, [inventory, selectedInventoryId]);

  // Quick calculator result
  const interactiveCalcResult = useMemo(() => {
    const price = Math.max(0, Number(calcWorkPrice) || 0);
    const materials = Math.max(0, Number(calcMaterialCost) || 0);
    const diff = price - materials;
    const salary = diff > 0 ? Math.round((diff / 2) * 100) / 100 : 0;
    return {
      price,
      materials,
      diff,
      salary,
      isExceeded: materials > price,
    };
  }, [calcWorkPrice, calcMaterialCost]);

  // Handle inventory deduction submit
  const handleDeductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryItem) return;
    const qty = Number(deductQuantity);
    if (!qty || qty <= 0) return;

    onDeductInventory(
      selectedInventoryItem.id,
      qty,
      deductNotes || `Списання матеріалу: ${selectedInventoryItem.name}`
    );

    setDeductSuccessMessage(
      `Списано ${qty} ${selectedInventoryItem.unit} матеріалу «${selectedInventoryItem.name}». Залишок на складі оновлено.`
    );
    setDeductQuantity('');
    setDeductNotes('');
    setTimeout(() => {
      setDeductSuccessMessage(null);
    }, 4500);
  };

  // Filter orders for salary tabulation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const client = clientMap.get(order.clientId);
      const vehicle = vehicleMap.get(order.vehicleId);
      const clientName = client ? client.name : '';
      const vehicleInfo = vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})` : '';

      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicleInfo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.works.some((w) => w.title.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'active') {
        return order.status !== 'delivered' && order.status !== 'cancelled';
      }
      if (statusFilter === 'completed') {
        return order.status === 'delivered';
      }
      return true;
    });
  }, [orders, searchQuery, statusFilter, clientMap, vehicleMap]);

  // Overall totals across filtered orders
  const salaryAggregates = useMemo(() => {
    let totalWorkPrice = 0;
    let totalMaterials = 0;
    let totalHelperSalary = 0;

    filteredOrders.forEach((order) => {
      order.works.forEach((w) => {
        const p = Math.max(0, Number(w.price) || 0);
        const m = Math.max(0, Number(w.materialCost) || 0);
        const calc = calculateWorkItemSalary(p, m);
        totalWorkPrice += p;
        totalMaterials += m;
        totalHelperSalary += calc.helperSalary;
      });
    });

    return {
      totalWorkPrice,
      totalMaterials,
      totalHelperSalary,
    };
  }, [filteredOrders]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0e1626] to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Заробітна плата
            </h1>
            <p className="text-xs text-slate-400">
              Списання матеріалів зі складу та прозорий розрахунок заробітної плати підготовщика за формулою:{' '}
              <span className="font-mono text-amber-300 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                (Ціна - Матеріали) / 2
              </span>
            </p>
          </div>
        </div>

        {/* Global KPI stats */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-1 md:pb-0">
          <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Сума робіт</span>
            <span className="text-sm font-black font-mono text-white">
              {formatCurrency(salaryAggregates.totalWorkPrice)}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Матеріали</span>
            <span className="text-sm font-black font-mono text-rose-400">
              {formatCurrency(salaryAggregates.totalMaterials)}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 shrink-0">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">Зарплата підготовщика</span>
            <span className="text-base font-black font-mono text-amber-400">
              {formatCurrency(salaryAggregates.totalHelperSalary)}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================
          СЕКЦІЯ 1: СПИСАННЯ МАТЕРІАЛІВ ЗІ СКЛАДУ
          ========================================================= */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                1. Списання матеріалів зі складу
              </h2>
              <p className="text-xs text-slate-400">
                Оберіть матеріал зі складу, вкажіть кількість для списання на витрати майстерні
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 self-start sm:self-auto">
            На складі позицій: {inventory.length}
          </span>
        </div>

        {deductSuccessMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{deductSuccessMessage}</span>
          </div>
        )}

        <form onSubmit={handleDeductSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Inventory item select */}
          <div className="md:col-span-4">
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
              Матеріал зі складу *
            </label>
            <select
              required
              value={selectedInventoryId}
              onChange={(e) => setSelectedInventoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="" disabled>
                Оберіть матеріал...
              </option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — Залишок: {item.quantity} {item.unit} ({formatCurrency(item.price)}/{item.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity to deduct */}
          <div className="md:col-span-2">
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
              Кількість до списання *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.0"
                value={deductQuantity}
                onChange={(e) => setDeductQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500 pr-12"
              />
              <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">
                {selectedInventoryItem ? selectedInventoryItem.unit : 'од.'}
              </span>
            </div>
          </div>

          {/* Notes / Order reference */}
          <div className="md:col-span-3">
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
              Примітка / Призначення
            </label>
            <input
              type="text"
              placeholder="напр. На бампер передній, ґрунтовка"
              value={deductNotes}
              onChange={(e) => setDeductNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Submit Button */}
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={!selectedInventoryItem || !deductQuantity}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20"
            >
              <MinusCircle className="w-4 h-4" />
              Списати матеріал зі складу
            </button>
          </div>
        </form>

        {/* Selected item stock preview */}
        {selectedInventoryItem && (
          <div className="flex flex-wrap items-center gap-4 px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <div className="text-slate-400">
              Поточний залишок:{' '}
              <span className="font-mono font-bold text-white">
                {selectedInventoryItem.quantity} {selectedInventoryItem.unit}
              </span>
            </div>
            <div className="text-slate-400">
              Собівартість:{' '}
              <span className="font-mono font-bold text-amber-400">
                {formatCurrency(selectedInventoryItem.price)} / {selectedInventoryItem.unit}
              </span>
            </div>
            {deductQuantity && Number(deductQuantity) > 0 && (
              <div className="text-slate-400">
                Вартість списання:{' '}
                <span className="font-mono font-bold text-rose-400">
                  {formatCurrency(Number(deductQuantity) * selectedInventoryItem.price)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================
          СЕКЦІЯ: ІНТЕРАКТИВНИЙ ШВИДКИЙ КАЛЬКУЛЯТОР ПЕРЕВІРКИ
          (Бампер передній ціна 10000, матеріали 4000 => Зарплата (10000-4000)/2 = 3000)
          ========================================================= */}
      <div className="p-5 rounded-2xl bg-[#0d1424] border border-amber-500/30 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                Калькулятор перевірки розрахунку зарплати
                <span className="text-[10px] font-normal lowercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  зразок формули
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Перевірте точний розрахунок за вказаною Вами формулою або введіть власні суми:
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Title */}
          <div className="sm:col-span-4">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Назва деталі / роботи
            </label>
            <input
              type="text"
              value={calcWorkTitle}
              onChange={(e) => setCalcWorkTitle(e.target.value)}
              placeholder="напр. Бампер передній"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Price */}
          <div className="sm:col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Ціна роботи (₴)
            </label>
            <input
              type="number"
              min="0"
              value={calcWorkPrice}
              onChange={(e) => setCalcWorkPrice(e.target.value)}
              placeholder="10000"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono font-bold text-right focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Materials */}
          <div className="sm:col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Матеріали (₴)
            </label>
            <input
              type="number"
              min="0"
              value={calcMaterialCost}
              onChange={(e) => setCalcMaterialCost(e.target.value)}
              placeholder="4000"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-rose-300 font-mono font-bold text-right focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Reset button */}
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setCalcWorkTitle('Бампер передній');
                setCalcWorkPrice('10000');
                setCalcMaterialCost('4000');
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors w-full text-center"
            >
              Скинути (10000 / 4000)
            </button>
          </div>
        </div>

        {/* Calculation Visual Ribbon */}
        <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-300">Формула:</span>
            <span className="font-mono text-white font-bold bg-slate-900 px-2 py-1 rounded border border-slate-800">
              ({formatCurrency(interactiveCalcResult.price)} - {formatCurrency(interactiveCalcResult.materials)}) / 2
            </span>
            <span className="text-slate-500">=</span>
            <span className="font-mono text-slate-300 font-bold bg-slate-900 px-2 py-1 rounded border border-slate-800">
              {formatCurrency(interactiveCalcResult.diff)} / 2
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-bold text-slate-400">Зарплата підготовщика:</span>
            <span className="text-xl font-black font-mono text-amber-400 bg-amber-500/20 px-3.5 py-1 rounded-xl border border-amber-500/40">
              {formatCurrency(interactiveCalcResult.salary)}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================
          СЕКЦІЯ 2: НАРАХУВАННЯ ЗАРПЛАТИ ПО ВСІХ НАРЯДАХ
          ========================================================= */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                2. Нарахування заробітної плати по нарядах-замовленнях
              </h2>
              <p className="text-xs text-slate-400">
                Детальний розрахунок зарплати підготовщика для кожної виконаної роботи
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Пошук наряду, авто або роботи..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-48 sm:w-60"
              />
            </div>
            <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'active'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                В роботі
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'completed'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Видані
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Всі
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
            <p className="text-sm text-slate-400">Нарядів за обраними критеріями не знайдено</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrderIds.has(order.id);
              const client = clientMap.get(order.clientId);
              const vehicle = vehicleMap.get(order.vehicleId);
              const clientDisplayName = client ? client.name : 'Клієнт';
              const vehicleDisplayInfo = vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})` : 'Автомобіль';

              // Calculate order-level salary
              const orderWorksTotal = order.works.reduce((sum, w) => sum + (Number(w.price) || 0), 0);
              const orderMaterialsTotal = order.works.reduce(
                (sum, w) => sum + (Number(w.materialCost) || 0),
                0
              );
              const orderHelperSalary = order.works.reduce((sum, w) => {
                const calc = calculateWorkItemSalary(Number(w.price) || 0, Number(w.materialCost) || 0);
                return sum + calc.helperSalary;
              }, 0);

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden hover:border-slate-700 transition-all"
                >
                  {/* Order Accordion Header */}
                  <div
                    onClick={() => toggleOrderExpand(order.id)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-bold">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{order.orderNumber}</span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {clientDisplayName} • {vehicleDisplayInfo}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          Створено: {formatDate(order.createdAt)} • Робіт: {order.works.length}
                        </span>
                      </div>
                    </div>

                    {/* Order summary stats right */}
                    <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto text-xs">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          Сума робіт:
                        </span>
                        <span className="font-mono font-semibold text-white">
                          {formatCurrency(orderWorksTotal)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          Матеріали:
                        </span>
                        <span className="font-mono font-semibold text-rose-400">
                          {formatCurrency(orderMaterialsTotal)}
                        </span>
                      </div>
                      <div className="text-right bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        <span className="text-[10px] text-amber-300 uppercase font-bold block">
                          ЗП підготовщика:
                        </span>
                        <span className="font-mono font-black text-amber-400">
                          {formatCurrency(orderHelperSalary)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Works Breakdown */}
                  {isExpanded && (
                    <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/90 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Подетальний розрахунок зарплати за формулою (Ціна - Матеріали) / 2:
                      </div>

                      {order.works.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">Робіт у цьому наряді не додано.</p>
                      ) : (
                        <div className="border border-slate-800 rounded-xl overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-semibold text-[11px]">
                              <tr>
                                <th className="p-2.5 w-10 text-center">№</th>
                                <th className="p-2.5">Найменування роботи</th>
                                <th className="p-2.5 text-right">Ціна роботи</th>
                                <th className="p-2.5 text-right">Матеріали</th>
                                <th className="p-2.5 text-center">Формула розрахунку</th>
                                <th className="p-2.5 text-right text-amber-400 font-bold">Зарплата підготовщика</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {order.works.map((w, idx) => {
                                const p = Math.max(0, Number(w.price) || 0);
                                const m = Math.max(0, Number(w.materialCost) || 0);
                                const calc = calculateWorkItemSalary(p, m);

                                return (
                                  <tr
                                    key={w.id}
                                    className={`hover:bg-slate-900/40 transition-colors ${
                                      idx % 2 === 1 ? 'bg-slate-900/20' : 'bg-transparent'
                                    }`}
                                  >
                                    <td className="p-2.5 text-center text-slate-500 font-mono text-[11px]">
                                      {idx + 1}
                                    </td>
                                    <td className="p-2.5">
                                      <div className="font-medium text-white">{w.title}</div>
                                      {w.category && (
                                        <span className="text-[10px] text-slate-400">
                                          Секція: {w.category}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2.5 text-right font-mono text-white font-bold">
                                      {formatCurrency(p)}
                                    </td>
                                    <td className="p-2.5 text-right font-mono text-rose-400">
                                      {formatCurrency(m)}
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <span className="font-mono text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                        ({formatCurrency(p)} - {formatCurrency(m)}) / 2
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-black text-amber-400 text-sm">
                                      {formatCurrency(calc.helperSalary)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-slate-900 font-bold border-t border-slate-800 text-xs">
                              <tr>
                                <td colSpan={2} className="p-2.5 text-slate-300">
                                  Разом по наряду {order.orderNumber}:
                                </td>
                                <td className="p-2.5 text-right font-mono text-white">
                                  {formatCurrency(orderWorksTotal)}
                                </td>
                                <td className="p-2.5 text-right font-mono text-rose-400">
                                  {formatCurrency(orderMaterialsTotal)}
                                </td>
                                <td className="p-2.5 text-center text-slate-400 text-[10px]">
                                  (Разом робіт - Разом мат.) / 2
                                </td>
                                <td className="p-2.5 text-right font-mono text-amber-400 text-sm font-black">
                                  {formatCurrency(orderHelperSalary)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {onSelectOrder && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold"
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            Перейти до замовлення {order.orderNumber}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
