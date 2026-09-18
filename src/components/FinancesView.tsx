import React, { useState, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Plus,
  Search,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Edit2,
  FileText,
  Filter,
  CheckCircle2,
  UserX,
  Coins,
  Wrench,
} from 'lucide-react';
import { FinanceTransaction, Order, Client, TransactionType, PaymentMethod } from '../types';
import { Modal } from './Modal';
import { formatCurrency, formatDate, PAYMENT_METHODS } from '../lib/formatters';
import { calculateOrderSalarySummary } from '../lib/salary';

interface FinancesViewProps {
  transactions: FinanceTransaction[];
  orders: Order[];
  clients: Client[];
  onSaveTransaction: (tx: FinanceTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddPaymentToOrder: (orderId: string, amount: number, method: PaymentMethod, notes?: string) => void;
  onSelectOrder: (order: Order) => void;
  initialCreateOpen?: boolean;
  onCloseInitialCreate?: () => void;
}

export const FinancesView: React.FC<FinancesViewProps> = ({
  transactions,
  orders,
  clients,
  onSaveTransaction,
  onDeleteTransaction,
  onAddPaymentToOrder,
  onSelectOrder,
  initialCreateOpen = false,
  onCloseInitialCreate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(initialCreateOpen);

  // Quick Settle Debt Modal
  const [settleOrder, setSettleOrder] = useState<Order | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('cash');
  const [settleNotes, setSettleNotes] = useState('');

  // Form State for manual transaction
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('Закупівля матеріалів');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Calculation of Summary Metrics
  const totalIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const netBalance = totalIncome - totalExpense;

  const totalDebts = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);
  }, [orders]);

  const debtorOrders = useMemo(() => {
    return orders.filter((o) => o.remainingAmount > 0);
  }, [orders]);

  // Overall payroll fund statistics calculated from orders
  const payrollStats = useMemo(() => {
    let helper = 0;
    let painter = 0;
    let workMaterials = 0;
    orders.forEach((o) => {
      const sum = calculateOrderSalarySummary(o.works, o.materials);
      helper += sum.totalHelperSalary;
      painter += sum.totalPainterSalary;
      workMaterials += sum.totalWorkMaterials;
    });
    return {
      helper,
      painter,
      total: helper + painter,
      workMaterials,
    };
  }, [orders]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tx.description.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q);

      const matchesType = typeFilter === 'all' || tx.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, typeFilter]);

  const openCreateModal = (defType: TransactionType = 'expense') => {
    setType(defType);
    setCategory(defType === 'income' ? 'Оплата замовлення' : 'Закупівля матеріалів');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setPaymentMethod(defType === 'income' ? 'cash' : 'card');
    setIsCreateOpen(true);
  };

  const openEditModal = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setType(tx.type);
    setCategory(tx.category);
    setAmount(String(tx.amount));
    setDate(tx.date);
    setDescription(tx.description);
    setPaymentMethod(tx.paymentMethod);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || !description.trim()) return;

    const newTx: FinanceTransaction = {
      id: editingTx ? editingTx.id : 'tx-' + Date.now(),
      type,
      category: category.trim(),
      amount: numAmount,
      date,
      description: description.trim(),
      paymentMethod,
      createdAt: editingTx ? editingTx.createdAt : new Date().toISOString(),
    };

    onSaveTransaction(newTx);
    setIsCreateOpen(false);
    setEditingTx(null);
    if (onCloseInitialCreate) onCloseInitialCreate();
  };

  const handleSettleDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleOrder) return;
    const amt = Number(settleAmount);
    if (!amt || amt <= 0) return;

    onAddPaymentToOrder(settleOrder.id, amt, settleMethod, settleNotes);
    setSettleOrder(null);
    setSettleAmount('');
    setSettleNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-400" />
            Фінанси та взаєморозрахунки
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Облік доходів, виробничих витрат цеху та контроль заборгованості клієнтів
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openCreateModal('income')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all active:scale-95 shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            Дохід
          </button>
          <button
            onClick={() => openCreateModal('expense')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-rose-500 hover:bg-rose-400 text-white transition-all active:scale-95 shadow-md shadow-rose-500/20"
          >
            <Plus className="w-4 h-4 text-white" />
            Витрата
          </button>
        </div>
      </div>

      {/* 4 Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance / Net profit */}
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Чистий прибуток
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
            {formatCurrency(netBalance)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Доходи мінус фактичні витрати
          </div>
        </div>

        {/* Total Incomes */}
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Всього доходів</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            {formatCurrency(totalIncome)}
          </div>
          <div className="mt-2 text-xs text-emerald-400/90 font-medium">
            Оплати замовлень та аванси
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Всього витрат</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            {formatCurrency(totalExpense)}
          </div>
          <div className="mt-2 text-xs text-rose-400/90 font-medium">
            Матеріали, оренда, світло, інструмент
          </div>
        </div>

        {/* Total Customer Debts */}
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Борги клієнтів</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
            {formatCurrency(totalDebts)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {debtorOrders.length} неоплачених замовлень
          </div>
        </div>
      </div>

      {/* Workshop Payroll Fund Analytics */}
      <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Фонд заробітної плати майстрів (Наряди робіт)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Формула наряду: (Ціна роботи - Вартість матеріалів) / 2
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              👨‍🔧 Нараховано Підготовщику:
            </span>
            <span className="text-lg font-black text-amber-400 font-mono">
              {formatCurrency(payrollStats.helper)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">50% від бази робіт</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              🎨 Нараховано Маляру:
            </span>
            <span className="text-lg font-black text-purple-400 font-mono">
              {formatCurrency(payrollStats.painter)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">50% від бази робіт</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              🧪 Матеріали за нарядами:
            </span>
            <span className="text-lg font-black text-blue-400 font-mono">
              {formatCurrency(payrollStats.workMaterials)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Собівартість робіт</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              💼 Загальний фонд зарплат:
            </span>
            <span className="text-lg font-black text-white font-mono">
              {formatCurrency(payrollStats.total)}
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">Підготовщик + Маляр</span>
          </div>
        </div>
      </div>

      {/* Customer Debts Section */}
      {debtorOrders.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#111827] border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserX className="w-4 h-4 text-amber-400" />
              Список боржників (неоплачені залишки)
            </h3>
            <span className="text-xs font-semibold text-amber-400 font-mono">
              Разом боргів: {formatCurrency(totalDebts)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {debtorOrders.map((order) => {
              const client = clients.find((c) => c.id === order.clientId);
              return (
                <div
                  key={order.id}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-sm">{client?.name || 'Клієнт'}</div>
                      <div className="text-slate-400 text-[11px]">{client?.phone}</div>
                      <div className="font-mono text-amber-400 text-[11px] mt-0.5">
                        Замовлення: {order.orderNumber}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">Борг:</span>
                      <span className="font-black text-rose-400 text-sm font-mono">
                        {formatCurrency(order.remainingAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectOrder(order)}
                      className="text-slate-400 hover:text-white underline text-[11px]"
                    >
                      Відкрити наряд
                    </button>
                    <button
                      onClick={() => {
                        setSettleOrder(order);
                        setSettleAmount(String(order.remainingAmount));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition-colors"
                    >
                      Погасити борг
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions Journal */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white tracking-tight">Журнал фінансових операцій</h3>

          {/* Search & Filter pills */}
          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук операції..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#111827] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="inline-flex rounded-lg border border-slate-800 p-0.5 bg-[#111827]">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  typeFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Всі
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  typeFilter === 'income' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Доходи
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  typeFilter === 'expense' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Витрати
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-800 bg-[#111827] space-y-3">
            <Wallet className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Операцій не знайдено</p>
            <p className="text-xs text-slate-500">Додайте перший дохід або витрату</p>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#111827]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px] font-semibold">
                  <tr>
                    <th className="p-3.5">Дата</th>
                    <th className="p-3.5">Опис операції</th>
                    <th className="p-3.5">Категорія</th>
                    <th className="p-3.5">Оплата</th>
                    <th className="p-3.5 text-right">Сума</th>
                    <th className="p-3.5 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{tx.description}</div>
                        {tx.orderId && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            Прив'язка до замовлення
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px]">
                          {tx.category}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                        {PAYMENT_METHODS[tx.paymentMethod] || tx.paymentMethod}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-sm ${
                            tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Редагувати"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Видалити цю транзакцію на ${formatCurrency(tx.amount)}?`)) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Видалити"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Transaction */}
      <Modal
        isOpen={isCreateOpen || Boolean(editingTx)}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingTx(null);
          if (onCloseInitialCreate) onCloseInitialCreate();
        }}
        title={editingTx ? 'Редагувати операцію' : type === 'income' ? 'Новий дохід' : 'Нова витрата'}
        subtitle="Зафіксуйте фінансовий рух у касі малярного цеху"
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          {/* Type radio buttons */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('Оплата замовлення');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'income' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              + Дохід (надходження)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory('Закупівля матеріалів');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              - Витрата (списання)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Сума (₴) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="напр. 3500"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-base font-mono font-bold text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Дата *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Категорія *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {type === 'income' ? (
                <>
                  <option value="Оплата замовлення">Оплата замовлення</option>
                  <option value="Аванс замовлення">Аванс замовлення</option>
                  <option value="Повна оплата">Повна оплата</option>
                  <option value="Полірування / Додаткові послуги">Полірування / Додаткові послуги</option>
                  <option value="Інший дохід">Інший дохід</option>
                </>
              ) : (
                <>
                  <option value="Закупівля матеріалів">Закупівля матеріалів (ЛФМ, лаки, грунти)</option>
                  <option value="Оренда боксу">Оренда боксу / камери</option>
                  <option value="Електроенергія та тепло">Електроенергія та опалення камери</option>
                  <option value="Інструмент та обладнання">Інструмент та фарбопульти</option>
                  <option value="Зарплата / Робота помічника">Зарплата / Робота помічника</option>
                  <option value="Податки та бухгалтерія">Податки та банківські комісії</option>
                  <option value="Інші витрати">Інші виробничі витрати</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Опис / Призначення *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="напр. Оплата рахунку за електроенергію малярного боксу"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Спосіб розрахунку
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="cash">Готівка</option>
              <option value="card">На банківську картку</option>
              <option value="iban">Безготівковий розрахунок (IBAN / ФОП)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingTx(null);
                if (onCloseInitialCreate) onCloseInitialCreate();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
            >
              {editingTx ? 'Зберегти зміни' : 'Зафіксувати операцію'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Settle Debt for Order */}
      {settleOrder && (
        <Modal
          isOpen={Boolean(settleOrder)}
          onClose={() => setSettleOrder(null)}
          title="Погашення боргу"
          subtitle={`Замовлення ${settleOrder.orderNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleSettleDebtSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Клієнт:</span>
                <span className="text-white font-semibold">
                  {clients.find((c) => c.id === settleOrder.clientId)?.name}
                </span>
              </div>
              <div className="flex justify-between text-rose-400 font-bold pt-1 border-t border-slate-800">
                <span>Сума залишку (боргу):</span>
                <span className="font-mono text-sm">{formatCurrency(settleOrder.remainingAmount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Сума до сплати (₴) *
              </label>
              <input
                type="number"
                required
                min="1"
                max={settleOrder.remainingAmount}
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-lg font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Спосіб оплати
              </label>
              <select
                value={settleMethod}
                onChange={(e) => setSettleMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="cash">Готівка</option>
                <option value="card">На картку</option>
                <option value="iban">Безготівка (IBAN / ФОП)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Коментар
              </label>
              <input
                type="text"
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                placeholder="напр. Закриття боргу по VW Passat"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSettleOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20"
              >
                Зарахувати платіж
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
