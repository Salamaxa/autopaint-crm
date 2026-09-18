import React, { useMemo } from 'react';
import {
  TrendingUp,
  ClipboardList,
  AlertCircle,
  Clock,
  Car,
  Users,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  CheckCircle2,
  Paintbrush,
  Sparkles,
  Coins,
  Wrench,
} from 'lucide-react';
import { Client, Vehicle, Order, InventoryItem, FinanceTransaction, ActiveTab, OrderStatus } from '../types';
import { formatCurrency, formatDate, ORDER_STATUS_CONFIG } from '../lib/formatters';
import { StatusBadge, PaymentBadge } from './StatusBadge';
import { calculateOrderSalarySummary } from '../lib/salary';

interface DashboardViewProps {
  orders: Order[];
  clients: Client[];
  vehicles: Vehicle[];
  inventory: InventoryItem[];
  transactions: FinanceTransaction[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewOrder: () => void;
  onOpenNewClient: () => void;
  onOpenNewTransaction: () => void;
  onSelectOrder: (order: Order) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  clients,
  vehicles,
  inventory,
  transactions,
  setActiveTab,
  onOpenNewOrder,
  onOpenNewClient,
  onOpenNewTransaction,
  onSelectOrder,
}) => {
  // Statistics calculations
  const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const totalDebt = orders.reduce((acc, curr) => acc + (curr.remainingAmount || 0), 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netProfit = totalIncome - totalExpenses;

  const lowStockItems = inventory.filter((i) => i.quantity <= i.minQuantity);

  // Status breakdown
  const statusCounts: Record<OrderStatus, number> = {
    new: orders.filter((o) => o.status === 'new').length,
    preparation: orders.filter((o) => o.status === 'preparation').length,
    painting: orders.filter((o) => o.status === 'painting').length,
    polishing: orders.filter((o) => o.status === 'polishing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  // Payroll summary across all orders
  const payrollSummary = useMemo(() => {
    let helperTotal = 0;
    let painterTotal = 0;
    let worksTotal = 0;
    let workMaterialsTotal = 0;

    orders.forEach((order) => {
      const summary = calculateOrderSalarySummary(order.works, order.materials);
      helperTotal += summary.totalHelperSalary;
      painterTotal += summary.totalPainterSalary;
      worksTotal += summary.totalWorksPrice;
      workMaterialsTotal += summary.totalWorkMaterials;
    });

    return {
      helperTotal,
      painterTotal,
      totalPayroll: helperTotal + painterTotal,
      worksTotal,
      workMaterialsTotal,
    };
  }, [orders]);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#131b2e] to-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Панель керування</h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Малярний цех
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Оперативна статистика замовлень, робіт, складу та фінансів
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={onOpenNewOrder}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            Нове замовлення
          </button>
          <button
            onClick={onOpenNewClient}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all"
          >
            <Users className="w-4 h-4 text-slate-400" />
            Клієнт
          </button>
          <button
            onClick={onOpenNewTransaction}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all"
          >
            <TrendingUp className="w-4 h-4 text-slate-400" />
            Фінанси
          </button>
        </div>
      </div>

      {/* 4 Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Orders */}
        <div
          onClick={() => setActiveTab('orders')}
          className="p-4 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">В роботі</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{activeOrders.length}</span>
            <span className="text-xs text-slate-400 font-medium">авто в боксах</span>
          </div>
          <div className="mt-2.5 text-xs text-amber-400 flex items-center gap-1 font-medium">
            <span>{statusCounts.painting} на фарбуванні</span>
            <span>•</span>
            <span>{statusCounts.polishing} на сушці</span>
          </div>
        </div>

        {/* Metric 2: Net Revenue / Income */}
        <div
          onClick={() => setActiveTab('finances')}
          className="p-4 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Чистий прибуток</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
              {formatCurrency(netProfit)}
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-400 flex items-center gap-2">
            <span className="text-emerald-400/90 font-medium">+{formatCurrency(totalIncome)}</span>
            <span>/</span>
            <span className="text-rose-400/90 font-medium">-{formatCurrency(totalExpenses)}</span>
          </div>
        </div>

        {/* Metric 3: Client Debt */}
        <div
          onClick={() => setActiveTab('finances')}
          className="p-4 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Борги клієнтів</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-400">
              {formatCurrency(totalDebt)}
            </span>
          </div>
          <div className="mt-2.5 text-xs text-slate-400">
            {orders.filter((o) => o.remainingAmount > 0).length} замовлень з несплаченим залишком
          </div>
        </div>

        {/* Metric 4: Warehouse Alerts */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="p-4 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Склад матеріалів</span>
            <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'} group-hover:scale-110 transition-transform`}>
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{inventory.length}</span>
            <span className="text-xs text-slate-400 font-medium">позицій</span>
          </div>
          <div className="mt-2.5 text-xs">
            {lowStockItems.length > 0 ? (
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 inline" /> {lowStockItems.length} позицій закінчуються!
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">Усі матеріали в нормі</span>
            )}
          </div>
        </div>
      </div>

      {/* Production Pipeline Status Bar */}
      <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Paintbrush className="w-4 h-4 text-amber-400" />
            Стан робіт у малярному цеху
          </h2>
          <button
            onClick={() => setActiveTab('orders')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            Всі замовлення <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {[
            { status: 'new' as OrderStatus, label: 'Нові / Прийом', count: statusCounts.new, color: 'border-blue-500/40 bg-blue-500/5 text-blue-400' },
            { status: 'preparation' as OrderStatus, label: 'Підготовка', count: statusCounts.preparation, color: 'border-amber-500/40 bg-amber-500/5 text-amber-400' },
            { status: 'painting' as OrderStatus, label: 'Фарбування', count: statusCounts.painting, color: 'border-purple-500/40 bg-purple-500/5 text-purple-400' },
            { status: 'polishing' as OrderStatus, label: 'Сушка / Полір.', count: statusCounts.polishing, color: 'border-cyan-500/40 bg-cyan-500/5 text-cyan-400' },
            { status: 'ready' as OrderStatus, label: 'Готово до видачі', count: statusCounts.ready, color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' },
          ].map((col) => (
            <div
              key={col.status}
              onClick={() => setActiveTab('orders')}
              className={`p-3 rounded-xl border ${col.color} cursor-pointer transition-all hover:bg-opacity-20 flex flex-col justify-between`}
            >
              <div className="text-xs font-semibold text-slate-300 mb-1">{col.label}</div>
              <div className="text-xl font-black text-white">{col.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Workshop Payroll & Team Production Breakdown */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#111827] via-[#131b2e] to-[#111827] border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Заробітна плата цеху (Автоматичний розрахунок 50% / 50%)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Формула: (Ціна робіт - Матеріали) / 2
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
              👨‍🔧 ЗП Підготовщика:
            </span>
            <span className="text-lg font-black text-amber-400 font-mono">
              {formatCurrency(payrollSummary.helperTotal)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Частка підготовки</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
              🎨 Частка Маляра:
            </span>
            <span className="text-lg font-black text-purple-400 font-mono">
              {formatCurrency(payrollSummary.painterTotal)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Частка фарбування</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
              🧪 Матеріали робіт:
            </span>
            <span className="text-lg font-black text-blue-400 font-mono">
              {formatCurrency(payrollSummary.workMaterialsTotal)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Списано на роботи</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
              💼 Загальний ФОП робіт:
            </span>
            <span className="text-lg font-black text-white font-mono">
              {formatCurrency(payrollSummary.totalPayroll)}
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">Всі наряди</span>
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Orders & Alerts/Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Active Orders */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-tight">Поточні замовлення</h3>
            <button
              onClick={() => setActiveTab('orders')}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Переглянути всі ({orders.length})
            </button>
          </div>

          <div className="space-y-2.5">
            {recentOrders.map((order) => {
              const client = clients.find((c) => c.id === order.clientId);
              const vehicle = vehicles.find((v) => v.id === order.vehicleId);

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className="p-4 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {order.orderNumber}
                      </span>
                      <StatusBadge status={order.status} />
                      <PaymentBadge remaining={order.remainingAmount} total={order.totalAmount} />
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Car className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{vehicle ? `${vehicle.make} ${vehicle.model}` : 'Невідоме авто'}</span>
                      {vehicle?.licensePlate && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
                          {vehicle.licensePlate}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400">
                      Клієнт: <span className="text-slate-200">{client?.name || 'Не вказано'}</span>
                      {order.deadlineDate && (
                        <span className="ml-2 text-slate-400">
                          • Здача до: <strong className="text-slate-300">{formatDate(order.deadlineDate)}</strong>
                        </span>
                      )}
                    </p>

                    {(() => {
                      const orderSalary = calculateOrderSalarySummary(order.works, order.materials);
                      return (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          <span className="text-slate-500">Зарплати:</span>
                          <span className="text-amber-400 font-mono font-medium">
                            👨‍🔧 Підготовщик: {formatCurrency(orderSalary.totalHelperSalary)}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-purple-400 font-mono font-medium">
                            🎨 Маляр: {formatCurrency(orderSalary.totalPainterSalary)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">
                        {formatCurrency(order.totalAmount)}
                      </div>
                      {order.remainingAmount > 0 ? (
                        <div className="text-xs text-rose-400 font-medium">
                          Борг: {formatCurrency(order.remainingAmount)}
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-400 font-medium">
                          Сплачено
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-transform group-hover:translate-x-1 sm:mt-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Low Stock & Recent Transactions */}
        <div className="space-y-6">
          {/* Low stock card */}
          <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Матеріали, що закінчуються
              </h3>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs text-amber-400 hover:underline font-semibold"
              >
                Склад
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 text-center">
                Всі матеріали в достатній кількості.
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 line-clamp-1">{item.name}</div>
                      <div className="text-[11px] text-rose-400">
                        Залишок: <strong>{item.quantity} {item.unit}</strong> (мін: {item.minQuantity})
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('inventory')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 shrink-0"
                    >
                      Поповнити
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent transactions */}
          <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Останні фінансові операції
              </h3>
              <button
                onClick={() => setActiveTab('finances')}
                className="text-xs text-amber-400 hover:underline font-semibold"
              >
                Всі
              </button>
            </div>

            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 max-w-[65%]">
                    <div className="font-semibold text-slate-200 line-clamp-1">
                      {tx.description}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatDate(tx.date)} • {tx.category}
                    </div>
                  </div>
                  <div
                    className={`font-bold font-mono text-xs ${
                      tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
