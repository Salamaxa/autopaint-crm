import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  Wrench,
  Boxes,
  Trash,
  Printer,
  AlertTriangle,
  Coins,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Paintbrush,
  Hammer,
  Sparkles,
  Layers,
  ChevronDown,
  FolderPlus,
  Check,
  FileText,
} from 'lucide-react';
import {
  Order,
  Client,
  Vehicle,
  InventoryItem,
  OrderStatus,
  OrderWorkItem,
  OrderMaterialItem,
  WORK_CATEGORIES,
  WorkCategory,
} from '../types';
import { Modal } from './Modal';
import { formatCurrency, formatDate } from '../lib/formatters';
import { StatusBadge, PaymentBadge } from './StatusBadge';
import {
  calculateWorkItemSalary,
  calculateOrderSalarySummary,
  groupWorksByCategory,
  WorkCategoryGroup,
} from '../lib/salary';

export const getCategoryMeta = (cat: string) => {
  switch (cat) {
    case 'Підготовка та пофарбування':
      return {
        label: 'Підготовка та пофарбування',
        icon: Paintbrush,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      };
    case 'Рихтувальні роботи':
      return {
        label: 'Рихтувальні роботи',
        icon: Hammer,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
      };
    case 'Слюсарні роботи':
      return {
        label: 'Слюсарні роботи',
        icon: Wrench,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      };
    case 'Детейлінг та полірування':
      return {
        label: 'Детейлінг та полірування',
        icon: Sparkles,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      };
    default:
      return {
        label: cat || 'Інші роботи',
        icon: Layers,
        color: 'text-slate-400',
        bg: 'bg-slate-800/40',
        border: 'border-slate-700/50',
        badge: 'bg-slate-800 text-slate-300 border-slate-700',
      };
  }
};

export const SECTION_TEMPLATES: Record<
  string,
  { title: string; price: number; materialCost: number }[]
> = {
  'Підготовка та пофарбування': [
    { title: 'Пофарбування бампера', price: 10000, materialCost: 2000 },
    { title: 'Пофарбування крила', price: 8000, materialCost: 1600 },
    { title: 'Пофарбування капота', price: 9500, materialCost: 2200 },
    { title: 'Пофарбування дверей', price: 8000, materialCost: 1700 },
  ],
  'Рихтувальні роботи': [
    { title: 'Ремонт крила правого', price: 4000, materialCost: 600 },
    { title: 'Рихтування на стапелі', price: 4500, materialCost: 500 },
    { title: 'Пайка кріплень та геометрія бампера', price: 2000, materialCost: 350 },
  ],
  'Слюсарні роботи': [
    { title: 'Демонтаж-монтаж деталей', price: 2500, materialCost: 300 },
    { title: 'Зняття та встановлення бампера', price: 1200, materialCost: 100 },
    { title: 'Розбирання та збирання дверей', price: 1600, materialCost: 150 },
  ],
  'Детейлінг та полірування': [
    { title: 'Полірування фар із захисним покриттям', price: 1500, materialCost: 300 },
    { title: 'Фінішне 3-етапне полірування кузова', price: 6000, materialCost: 1200 },
  ],
};

interface OrdersViewProps {
  orders: Order[];
  clients: Client[];
  vehicles: Vehicle[];
  inventory: InventoryItem[];
  onSaveOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onAddPayment: (orderId: string, amount: number, method: 'cash' | 'card' | 'iban', notes?: string) => void;
  selectedOrder?: Order | null;
  onClearSelectedOrder?: () => void;
  initialCreateOpen?: boolean;
  onCloseInitialCreate?: () => void;
  preselectedClientId?: string | null;
  preselectedVehicleId?: string | null;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  clients,
  vehicles,
  inventory,
  onSaveOrder,
  onDeleteOrder,
  onUpdateStatus,
  onAddPayment,
  selectedOrder,
  onClearSelectedOrder,
  initialCreateOpen = false,
  onCloseInitialCreate,
  preselectedClientId,
  preselectedVehicleId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(selectedOrder || null);
  const [isCreateOpen, setIsCreateOpen] = useState(initialCreateOpen);

  // Quick Payment Modal
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'iban'>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  useEffect(() => {
    if (selectedOrder) {
      setViewingOrder(selectedOrder);
    }
  }, [selectedOrder]);

  // Order Form State
  const [orderNumber, setOrderNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [status, setStatus] = useState<OrderStatus>('new');
  const [works, setWorks] = useState<OrderWorkItem[]>([]);
  const [materials, setMaterials] = useState<OrderMaterialItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [notes, setNotes] = useState('');

  // Tab for viewing order modal: 'order' (clean work order) vs 'salary' (dedicated payroll tab)
  const [orderModalTab, setOrderModalTab] = useState<'order' | 'salary'>('order');

  // Dynamic user-customizable sections in the order form
  const [formSections, setFormSections] = useState<string[]>([
    'Підготовка та пофарбування',
    'Рихтувальні роботи',
    'Слюсарні роботи',
  ]);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [showAddSectionBox, setShowAddSectionBox] = useState(false);
  const [editingSectionName, setEditingSectionName] = useState<string | null>(null);
  const [editingSectionValue, setEditingSectionValue] = useState('');

  // Available vehicles for selected client
  const clientVehicles = useMemo(() => {
    if (!clientId) return vehicles;
    return vehicles.filter((v) => v.clientId === clientId);
  }, [vehicles, clientId]);

  // Totals calculation
  const worksTotal = useMemo(() => {
    return works.reduce((sum, w) => sum + (Number(w.price) || 0), 0);
  }, [works]);

  const materialsTotal = useMemo(() => {
    return materials.reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  }, [materials]);

  const totalCalculated = worksTotal + materialsTotal;

  // Active form salary calculation summary
  const formSalarySummary = useMemo(() => {
    return calculateOrderSalarySummary(works, materials);
  }, [works, materials]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase().trim();
      const client = clients.find((c) => c.id === order.clientId);
      const vehicle = vehicles.find((v) => v.id === order.vehicleId);

      const matchesSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        (client && client.name.toLowerCase().includes(q)) ||
        (vehicle &&
          (vehicle.make.toLowerCase().includes(q) ||
            vehicle.model.toLowerCase().includes(q) ||
            vehicle.licensePlate.toLowerCase().includes(q)));

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = order.status !== 'delivered' && order.status !== 'cancelled';
      } else if (statusFilter === 'debt') {
        matchesStatus = order.remainingAmount > 0;
      } else if (statusFilter !== 'all') {
        matchesStatus = order.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [orders, clients, vehicles, searchQuery, statusFilter]);

  // Open Create
  const handleOpenCreate = () => {
    const nextNum = `AP-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;
    setOrderNumber(nextNum);
    const defClient = preselectedClientId || (clients[0]?.id || '');
    setClientId(defClient);
    const availableCars = vehicles.filter((v) => v.clientId === defClient);
    setVehicleId(preselectedVehicleId || (availableCars[0]?.id || ''));
    setOrderDate(new Date().toISOString().split('T')[0]);
    setDeadlineDate('');
    setStatus('new');

    const initialSections = ['Підготовка та пофарбування', 'Рихтувальні роботи', 'Слюсарні роботи'];
    setFormSections(initialSections);
    setWorks([
      {
        id: 'w-1-' + Date.now(),
        category: 'Підготовка та пофарбування',
        title: 'Пофарбування бампера',
        price: 10000,
        materialCost: 0,
        helperSalary: 5000,
        painterSalary: 5000,
      },
      {
        id: 'w-2-' + (Date.now() + 1),
        category: 'Підготовка та пофарбування',
        title: 'Пофарбування крила',
        price: 8000,
        materialCost: 0,
        helperSalary: 4000,
        painterSalary: 4000,
      },
      {
        id: 'w-3-' + (Date.now() + 2),
        category: 'Рихтувальні роботи',
        title: 'Ремонт крила правого',
        price: 4000,
        materialCost: 0,
        helperSalary: 2000,
        painterSalary: 2000,
      },
      {
        id: 'w-4-' + (Date.now() + 3),
        category: 'Слюсарні роботи',
        title: 'Демонтаж-монтаж деталей',
        price: 2500,
        materialCost: 0,
        helperSalary: 1250,
        painterSalary: 1250,
      },
    ]);
    setMaterials([]);
    setPaidAmount('0');
    setNotes('');
    setShowAddSectionBox(false);
    setNewSectionInput('');
    setEditingSectionName(null);
    setIsCreateOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setOrderNumber(order.orderNumber);
    setClientId(order.clientId);
    setVehicleId(order.vehicleId);
    setOrderDate(order.date);
    setDeadlineDate(order.deadlineDate || '');
    setStatus(order.status);

    // Extract all existing sections in order of appearance
    const existingSections: string[] = [];
    (order.works || []).forEach((w) => {
      const c = (w.category && w.category.trim()) || 'Підготовка та пофарбування';
      if (!existingSections.includes(c)) {
        existingSections.push(c);
      }
    });
    if (existingSections.length === 0) {
      existingSections.push('Підготовка та пофарбування');
    }
    setFormSections(existingSections);

    const sanitizedWorks = (order.works || []).map((w) => {
      const p = Number(w.price) || 0;
      const m = Number(w.materialCost) || 0;
      const calc = calculateWorkItemSalary(p, m);
      return {
        ...w,
        category: (w.category && w.category.trim()) || 'Підготовка та пофарбування',
        price: p,
        materialCost: m,
        helperSalary: typeof w.helperSalary === 'number' ? w.helperSalary : calc.helperSalary,
        painterSalary: typeof w.painterSalary === 'number' ? w.painterSalary : calc.painterSalary,
      };
    });

    setWorks(sanitizedWorks);
    setMaterials(order.materials.length > 0 ? [...order.materials] : []);
    setPaidAmount(String(order.paidAmount || 0));
    setNotes(order.notes || '');
    setShowAddSectionBox(false);
    setNewSectionInput('');
    setEditingSectionName(null);
  };

  // Dynamic Section Handlers
  const handleAddCustomSection = (customName?: string) => {
    const rawName = customName !== undefined ? customName : newSectionInput;
    const trimmed = rawName.trim();
    if (!trimmed) return;
    if (!formSections.includes(trimmed)) {
      setFormSections((prev) => [...prev, trimmed]);
    }
    setNewSectionInput('');
    setShowAddSectionBox(false);
  };

  const handleStartRenameSection = (name: string) => {
    setEditingSectionName(name);
    setEditingSectionValue(name);
  };

  const handleSaveRenameSection = () => {
    if (!editingSectionName) return;
    const trimmed = editingSectionValue.trim();
    if (trimmed && trimmed !== editingSectionName) {
      setFormSections((prev) => prev.map((s) => (s === editingSectionName ? trimmed : s)));
      setWorks((prev) =>
        prev.map((w) => (w.category === editingSectionName ? { ...w, category: trimmed } : w))
      );
    }
    setEditingSectionName(null);
    setEditingSectionValue('');
  };

  const handleDeleteSection = (sectionName: string) => {
    setFormSections((prev) => prev.filter((s) => s !== sectionName));
    setWorks((prev) => prev.filter((w) => w.category !== sectionName));
  };

  // Add work line directly to a specific section
  const handleAddWorkToSection = (
    categoryName: string,
    preset?: { title: string; price: number }
  ) => {
    const p = preset ? preset.price : 0;
    const calc = calculateWorkItemSalary(p, 0);
    setWorks((prev) => [
      ...prev,
      {
        id: 'w-' + Date.now() + Math.random().toString(36).substring(2, 6),
        category: categoryName,
        title: preset ? preset.title : '',
        price: p,
        materialCost: 0,
        helperSalary: calc.helperSalary,
        painterSalary: calc.painterSalary,
      },
    ]);
  };

  const updateWork = (id: string, patch: Partial<OrderWorkItem>) => {
    setWorks((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const updated = { ...w, ...patch };
        if ('price' in patch || 'materialCost' in patch) {
          const p = Math.max(0, Number(updated.price) || 0);
          const m = Math.max(0, Number(updated.materialCost) || 0);
          const calc = calculateWorkItemSalary(p, m);
          updated.price = p;
          updated.materialCost = m;
          updated.helperSalary = calc.helperSalary;
          updated.painterSalary = calc.painterSalary;
        }
        return updated;
      })
    );
  };

  const deleteWork = (id: string) => {
    setWorks((prev) => prev.filter((w) => w.id !== id));
  };

  // Add material line
  const handleAddMaterial = (fromInventoryId?: string) => {
    if (fromInventoryId) {
      const inv = inventory.find((i) => i.id === fromInventoryId);
      if (inv) {
        setMaterials([
          ...materials,
          {
            id: 'm-' + Date.now(),
            inventoryId: inv.id,
            name: inv.name,
            quantity: 1,
            unit: inv.unit,
            price: inv.price,
            total: inv.price,
          },
        ]);
        return;
      }
    }

    setMaterials([
      ...materials,
      {
        id: 'm-' + Date.now(),
        name: '',
        quantity: 1,
        unit: 'шт',
        price: 0,
        total: 0,
      },
    ]);
  };

  const handleSaveOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !clientId || !vehicleId) {
      alert('Будь ласка, оберіть клієнта та автомобіль');
      return;
    }

    const finalizedWorks = works.map((w) => {
      const p = Math.max(0, Number(w.price) || 0);
      const m = Math.max(0, Number(w.materialCost) || 0);
      const calc = calculateWorkItemSalary(p, m);
      return {
        ...w,
        category: (w.category && w.category.trim()) || 'Підготовка та пофарбування',
        price: p,
        materialCost: m,
        helperSalary: calc.helperSalary,
        painterSalary: calc.painterSalary,
      };
    });

    const paid = Number(paidAmount) || 0;
    const remaining = Math.max(0, totalCalculated - paid);

    const savedOrder: Order = {
      id: editingOrder ? editingOrder.id : 'ord-' + Date.now(),
      orderNumber: orderNumber.trim(),
      clientId,
      vehicleId,
      date: orderDate,
      deadlineDate: deadlineDate || undefined,
      status,
      works: finalizedWorks,
      materials,
      totalAmount: totalCalculated,
      paidAmount: paid,
      remainingAmount: remaining,
      notes: notes.trim() || undefined,
      createdAt: editingOrder ? editingOrder.createdAt : new Date().toISOString(),
    };

    onSaveOrder(savedOrder);
    setIsCreateOpen(false);
    setEditingOrder(null);
    if (onCloseInitialCreate) onCloseInitialCreate();
  };

  const submitQuickPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalOrder) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;

    onAddPayment(paymentModalOrder.id, amount, paymentMethod, paymentNotes);
    setPaymentModalOrder(null);
    setPaymentAmount('');
    setPaymentNotes('');

    const updated = orders.find((o) => o.id === paymentModalOrder.id);
    if (updated) {
      setViewingOrder({
        ...updated,
        paidAmount: updated.paidAmount + amount,
        remainingAmount: Math.max(0, updated.totalAmount - (updated.paidAmount + amount)),
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-400" />
            Журнал замовлень
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Кошториси, наряди робіт, списання матеріалів, розрахунок зарплат та контроль оплати
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          Нове замовлення
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук за номером (AP-...), клієнтом, моделлю авто або номером..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111827] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'Всі' },
            { id: 'active', label: 'В роботі' },
            { id: 'painting', label: 'Фарбування' },
            { id: 'ready', label: 'Готові' },
            { id: 'debt', label: 'З боргом' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-[#111827] space-y-3">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Замовлень не знайдено</p>
          <p className="text-xs text-slate-500">Спробуйте змінити фільтри або створіть нове замовлення</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const client = clients.find((c) => c.id === order.clientId);
            const vehicle = vehicles.find((v) => v.id === order.vehicleId);
            const salarySummary = calculateOrderSalarySummary(order.works, order.materials);

            return (
              <div
                key={order.id}
                className="p-4 sm:p-5 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-all space-y-3"
              >
                {/* Order Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-amber-400 text-sm sm:text-base">
                      {order.orderNumber}
                    </span>
                    <StatusBadge status={order.status} size="sm" />
                    <PaymentBadge remaining={order.remainingAmount} total={order.totalAmount} />
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(order.date)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {order.remainingAmount > 0 && (
                      <button
                        onClick={() => {
                          setPaymentModalOrder(order);
                          setPaymentAmount(String(order.remainingAmount));
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors"
                        title="Прийняти оплату"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Оплата
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setViewingOrder(order);
                        setOrderModalTab('order');
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Переглянути наряд-замовлення"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(order)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Редагувати"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Видалити замовлення ${order.orderNumber}?`)) {
                          onDeleteOrder(order.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Видалити"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Vehicle & Client Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Автомобіль:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Невідомо'}
                      </span>
                      {vehicle?.licensePlate && (
                        <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold border border-slate-700 text-[11px]">
                          {vehicle.licensePlate}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Клієнт:</span>
                    <div className="font-bold text-slate-200">{client ? client.name : '—'}</div>
                    <div className="text-[11px] text-slate-400">{client?.phone}</div>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">Термін виконання:</span>
                    <div className="font-semibold text-slate-200">
                      {order.deadlineDate ? formatDate(order.deadlineDate) : 'Без дедлайну'}
                    </div>
                  </div>
                </div>

                {/* Categories of Works in this Order */}
                {order.works && order.works.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-400" />
                      Секції робіт:
                    </span>
                    {groupWorksByCategory(order.works).map((grp) => {
                      const meta = getCategoryMeta(grp.category);
                      const CatIcon = meta.icon;
                      return (
                        <span
                          key={grp.category}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${meta.badge}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          <span>{grp.category}</span>
                          <span className="font-mono text-white/80 font-bold ml-0.5">({grp.works.length})</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Payroll & Material Summary Badges */}
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                        Зарплати:
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-semibold border border-amber-500/25 text-[11px]">
                        👨‍🔧 Підготовщик: {formatCurrency(salarySummary.totalHelperSalary)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-mono font-semibold border border-purple-500/25 text-[11px]">
                        🎨 Маляр: {formatCurrency(salarySummary.totalPainterSalary)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-mono text-[11px] border border-blue-500/25">
                        🧪 Матеріали робіт: {formatCurrency(salarySummary.totalWorkMaterials)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      ФОП наряду: <strong className="text-white">{formatCurrency(salarySummary.totalPayroll)}</strong>
                    </div>
                  </div>

                  {salarySummary.hasMaterialExceeded && (
                    <div className="text-[11px] text-rose-300 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/25 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>У {salarySummary.exceededCount} роботах вартість матеріалів перевищує ціну (зарплата = 0 ₴)</span>
                    </div>
                  )}
                </div>

                {/* Financial Summary & Status Quick Switch */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Статус:</span>
                    <select
                      value={order.status}
                      onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="new">Нове</option>
                      <option value="preparation">Підготовка / Рихтування</option>
                      <option value="painting">Фарбування</option>
                      <option value="polishing">Сушка / Полірування</option>
                      <option value="ready">Готове до видачі</option>
                      <option value="delivered">Видано клієнту</option>
                      <option value="cancelled">Скасовано</option>
                    </select>
                  </div>

                  {/* Financials */}
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-slate-400 mr-1.5">Сума наряду:</span>
                      <strong className="text-white text-sm font-bold font-mono">
                        {formatCurrency(order.totalAmount)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 mr-1.5">Оплачено:</span>
                      <span className="text-emerald-400 font-semibold font-mono">
                        {formatCurrency(order.paidAmount)}
                      </span>
                    </div>
                    {order.remainingAmount > 0 && (
                      <div>
                        <span className="text-slate-400 mr-1.5">Залишок:</span>
                        <span className="text-rose-400 font-bold font-mono">
                          {formatCurrency(order.remainingAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Order */}
      <Modal
        isOpen={isCreateOpen || Boolean(editingOrder)}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingOrder(null);
          if (onCloseInitialCreate) onCloseInitialCreate();
        }}
        title={editingOrder ? `Редагувати ${editingOrder.orderNumber}` : 'Створення замовлення'}
        subtitle="Складіть кошторис робіт, вкажіть матеріали та перевірте розрахунок зарплат"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveOrderSubmit} className="space-y-5">
          {/* Order Header Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Номер замовлення *
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="AP-2024-..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Дата замовлення *
              </label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Обіцяна дата видачі
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Client & Vehicle Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Клієнт *
              </label>
              <select
                required
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  const matching = vehicles.filter((v) => v.clientId === e.target.value);
                  setVehicleId(matching[0]?.id || '');
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="" disabled>
                  Оберіть клієнта
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Автомобіль клієнта *
              </label>
              <select
                required
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="" disabled>
                  {clientVehicles.length === 0 ? 'У клієнта немає авто' : 'Оберіть автомобіль'}
                </option>
                {clientVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.licensePlate || 'без номера'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Етап / Статус
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="new">Нове замовлення</option>
              <option value="preparation">Підготовка / Рихтування</option>
              <option value="painting">Фарбування</option>
              <option value="polishing">Сушка / Полірування</option>
              <option value="ready">Готове до видачі</option>
              <option value="delivered">Видано клієнту</option>
              <option value="cancelled">Скасовано</option>
            </select>
          </div>

          {/* SECTION: Works Grouped into Dynamic Custom Sections */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  Таблиця найменування робіт (секції) ({works.length})
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Створюйте довільні секції робіт та вказуйте найменування і вартість кожної послуги
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSectionBox((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-sm"
                >
                  <FolderPlus className="w-3.5 h-3.5" /> + Додати секцію
                </button>
              </div>
            </div>

            {/* Add Custom Section Box & Presets */}
            {showAddSectionBox && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    Створити нову секцію робіт
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddSectionBox(false)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Скасувати
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Введіть назву секції (напр. Зварювальні роботи, Арматурні роботи...)"
                    value={newSectionInput}
                    onChange={(e) => setNewSectionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSection();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomSection()}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
                  >
                    Додати
                  </button>
                </div>

                {/* Popular section presets */}
                <div className="pt-1 border-t border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Швидкі готові варіанти секцій:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Підготовка та пофарбування',
                      'Рихтувальні роботи',
                      'Слюсарні роботи',
                      'Детейлінг та полірування',
                      'Арматурні роботи',
                      'Зварювальні роботи',
                      'Шиномонтаж та балансування',
                    ].map((presetName) => (
                      <button
                        key={presetName}
                        type="button"
                        onClick={() => handleAddCustomSection(presetName)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          formSections.includes(presetName)
                            ? 'bg-slate-800/80 text-slate-400 border-slate-700 cursor-default opacity-60'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                        disabled={formSections.includes(presetName)}
                      >
                        {formSections.includes(presetName) ? '✓ ' : '+ '}
                        {presetName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Sections List */}
            {formSections.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center space-y-3 bg-slate-950/40">
                <p className="text-sm font-semibold text-slate-200">Немає створених секцій робіт</p>
                <button
                  type="button"
                  onClick={() => setShowAddSectionBox(true)}
                  className="px-3.5 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors"
                >
                  + Створити першу секцію
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
                {formSections.map((sectionName) => {
                  const meta = getCategoryMeta(sectionName);
                  const CatIcon = meta.icon;
                  const sectionWorks = works.filter((w) => (w.category || '').trim() === sectionName.trim());
                  const sectionTotal = sectionWorks.reduce((sum, w) => sum + (Number(w.price) || 0), 0);
                  const templates = SECTION_TEMPLATES[sectionName] || [];

                  const isRenaming = editingSectionName === sectionName;

                  return (
                    <div
                      key={sectionName}
                      className={`p-3.5 rounded-xl border ${meta.border} bg-slate-900/60 space-y-3 shadow-sm`}
                    >
                      {/* Section Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`p-1.5 rounded-lg ${meta.badge} shrink-0`}>
                            <CatIcon className="w-4 h-4" />
                          </div>

                          {isRenaming ? (
                            <div className="flex items-center gap-2 flex-1 max-w-sm">
                              <input
                                type="text"
                                value={editingSectionValue}
                                onChange={(e) => setEditingSectionValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveRenameSection();
                                  } else if (e.key === 'Escape') {
                                    setEditingSectionName(null);
                                  }
                                }}
                                autoFocus
                                className="w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-amber-500 text-xs text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={handleSaveRenameSection}
                                className="p-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                                title="Зберегти назву"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSectionName(null)}
                                className="text-[11px] text-slate-400 hover:text-white px-1"
                              >
                                Скасувати
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <h5 className="text-sm font-bold text-white tracking-wide truncate">
                                {sectionName}
                              </h5>
                              <span className="text-[11px] font-mono text-slate-400 font-normal shrink-0">
                                ({sectionWorks.length} {sectionWorks.length === 1 ? 'робота' : 'робіт'})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartRenameSection(sectionName)}
                                className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors"
                                title="Перейменувати секцію"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Section Actions & Subtotal */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                            Сума: <strong className="text-white font-bold">{formatCurrency(sectionTotal)}</strong>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddWorkToSection(sectionName)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Додати роботу
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSection(sectionName)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title={`Видалити секцію «${sectionName}» разом з роботами`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Quick Presets for this Section (if available) */}
                      {templates.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="text-slate-500 text-[10px] uppercase font-bold">Зразки робіт:</span>
                          {templates.map((tpl) => (
                            <button
                              key={tpl.title}
                              type="button"
                              onClick={() => handleAddWorkToSection(sectionName, { title: tpl.title, price: tpl.price })}
                              className="px-2 py-0.5 rounded bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center gap-1"
                              title={`Додати ${tpl.title} за ${formatCurrency(tpl.price)}`}
                            >
                              <Plus className="w-2.5 h-2.5 text-amber-400" />
                              <span>{tpl.title}</span>
                              <span className="text-amber-400 font-mono">({formatCurrency(tpl.price)})</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Works inside this Section */}
                      {sectionWorks.length === 0 ? (
                        <div className="p-3 rounded-lg border border-dashed border-slate-800 bg-slate-950/30 text-center">
                          <p className="text-xs text-slate-400">
                            У цій секції ще немає робіт.{' '}
                            <button
                              type="button"
                              onClick={() => handleAddWorkToSection(sectionName)}
                              className="text-amber-400 hover:underline font-semibold"
                            >
                              Додайте першу роботу
                            </button>
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sectionWorks.map((work, wIdx) => (
                            <div
                              key={work.id}
                              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                {/* Row number */}
                                <div className="sm:col-span-1 text-center font-mono text-xs text-slate-500">
                                  #{wIdx + 1}
                                </div>

                                {/* Work title */}
                                <div className="sm:col-span-7">
                                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                                    Найменування роботи *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Вкажіть назву роботи (напр. Пофарбування бампера, Ремонт крила...)"
                                    value={work.title}
                                    onChange={(e) => updateWork(work.id, { title: e.target.value })}
                                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                                  />
                                </div>

                                {/* Work price */}
                                <div className="sm:col-span-3">
                                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                                    Вартість (₴) *
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      required
                                      placeholder="0"
                                      min="0"
                                      value={work.price || ''}
                                      onChange={(e) =>
                                        updateWork(work.id, {
                                          price: Math.max(0, Number(e.target.value) || 0),
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono font-bold text-right focus:outline-none focus:border-amber-500 pr-6"
                                    />
                                    <span className="absolute right-2 top-1.5 text-xs text-slate-500">₴</span>
                                  </div>
                                </div>

                                {/* Delete button */}
                                <div className="sm:col-span-1 flex justify-end self-end pb-0.5">
                                  <button
                                    type="button"
                                    onClick={() => deleteWork(work.id)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                    title="Видалити роботу"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Actions: Add Another Section & Works Total */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddSectionBox(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <FolderPlus className="w-4 h-4 text-amber-400" />
                + Додати ще секцію
              </button>

              <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                <span className="text-slate-400">
                  Всього робіт: <strong className="text-slate-200">{works.length}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Загальна сума робіт:</span>
                  <span className="font-mono font-black text-amber-400 text-base">
                    {formatCurrency(worksTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: Materials */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-amber-400" />
                Додаткові матеріали наряду ({materials.length}) — Разом: {formatCurrency(materialsTotal)}
              </h4>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddMaterial(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>
                    + Додати зі складу...
                  </option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} ({inv.quantity} {inv.unit} залиш.)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddMaterial()}
                  className="text-xs text-amber-400 hover:underline font-bold"
                >
                  + Вручну
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {materials.map((mat, index) => (
                <div key={mat.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Матеріал (напр. Лак HS, Грунт 4:1)"
                    value={mat.name}
                    onChange={(e) => {
                      const updated = [...materials];
                      updated[index].name = e.target.value;
                      setMaterials(updated);
                    }}
                    className="col-span-5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <div className="col-span-2 flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="К-сть"
                      value={mat.quantity || ''}
                      onChange={(e) => {
                        const updated = [...materials];
                        const q = Number(e.target.value) || 0;
                        updated[index].quantity = q;
                        updated[index].total = q * (updated[index].price || 0);
                        setMaterials(updated);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-center focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">{mat.unit}</span>
                  </div>
                  <div className="col-span-2 relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="Ціна"
                      value={mat.price || ''}
                      onChange={(e) => {
                        const updated = [...materials];
                        const p = Number(e.target.value) || 0;
                        updated[index].price = p;
                        updated[index].total = (updated[index].quantity || 0) * p;
                        setMaterials(updated);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-right focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2 font-mono font-bold text-slate-200 text-right">
                    {formatCurrency(mat.total)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMaterials(materials.filter((_, i) => i !== index));
                    }}
                    className="col-span-1 p-1 text-slate-500 hover:text-rose-400 text-center"
                  >
                    <Trash className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Comprehensive Totals Section */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              Загальна статистика по наряду
            </h4>

            {/* Mini KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Сума робіт:</span>
                <span className="font-mono font-bold text-xs text-white">{formatCurrency(worksTotal)}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Всі матеріали:</span>
                <span className="font-mono font-bold text-xs text-blue-400">
                  {formatCurrency(formSalarySummary.totalAllMaterials)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Фонд зарплат (ФОП):</span>
                <span className="font-mono font-bold text-xs text-amber-400">
                  {formatCurrency(formSalarySummary.totalPayroll)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Залишок майстерні:</span>
                <span className="font-mono font-bold text-xs text-emerald-400">
                  {formatCurrency(formSalarySummary.workshopProfit)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-800/80">
              <span className="text-slate-300 font-semibold">Загальна сума до оплати клієнтом:</span>
              <span className="text-lg font-black text-white font-mono">{formatCurrency(totalCalculated)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Сплачений аванс / сума:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={totalCalculated}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-500">₴</span>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Залишок до сплати (борг):
                </span>
                <span className="text-base font-black text-rose-400 font-mono">
                  {formatCurrency(Math.max(0, totalCalculated - (Number(paidAmount) || 0)))}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Нотатки майстра / Особливості замовлення
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="напр. Аванс отримано, викраску узгоджено, видача після 18:00..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingOrder(null);
                if (onCloseInitialCreate) onCloseInitialCreate();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20"
            >
              {editingOrder ? 'Зберегти зміни' : 'Створити замовлення'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Full Work Order / Invoice with Payroll & Financial Stats */}
      {viewingOrder && (
        <Modal
          isOpen={Boolean(viewingOrder)}
          onClose={() => {
            setViewingOrder(null);
            if (onClearSelectedOrder) onClearSelectedOrder();
          }}
          title={`Наряд-замовлення ${viewingOrder.orderNumber}`}
          subtitle={`Від ${formatDate(viewingOrder.date)}`}
          maxWidth="3xl"
        >
          {(() => {
            const summary = calculateOrderSalarySummary(viewingOrder.works, viewingOrder.materials);
            const client = clients.find((c) => c.id === viewingOrder.clientId);
            const vehicle = vehicles.find((v) => v.id === viewingOrder.vehicleId);

            return (
              <div className="space-y-4">
                {/* Modal Tab Switcher */}
                <div className="flex border-b border-slate-800 -mt-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderModalTab('order')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                      orderModalTab === 'order'
                        ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Наряд робіт
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderModalTab('salary')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                      orderModalTab === 'salary'
                        ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    Заробітня плата
                  </button>
                </div>

                {/* TAB 1: ЧИСТИЙ НАРЯД РОБІТ (Без зарплат і матеріалів) */}
                {orderModalTab === 'order' && (
                  <div className="space-y-4">
                    {/* Print & Quick Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={viewingOrder.status} size="md" />
                        <PaymentBadge remaining={viewingOrder.remainingAmount} total={viewingOrder.totalAmount} />
                      </div>

                      <div className="flex items-center gap-2">
                        {viewingOrder.remainingAmount > 0 && (
                          <button
                            onClick={() => {
                              setPaymentModalOrder(viewingOrder);
                              setPaymentAmount(String(viewingOrder.remainingAmount));
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-sm"
                          >
                            <DollarSign className="w-4 h-4" />
                            Внести оплату
                          </button>
                        )}
                        <button
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                        >
                          <Printer className="w-4 h-4" /> Друк наряду
                        </button>
                      </div>
                    </div>

                    {/* Client & Car info cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                          Замовник (Клієнт):
                        </span>
                        <div className="text-sm font-bold text-white">{client?.name || 'Не вказано'}</div>
                        <div className="text-slate-400 mt-0.5">{client?.phone || '—'}</div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                          Автомобіль:
                        </span>
                        <div className="text-sm font-bold text-white">
                          {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year || ''})` : '—'}
                        </div>
                        <div className="text-amber-400 font-mono font-bold mt-0.5">
                          {vehicle?.licensePlate || 'Без держномера'}
                        </div>
                        {vehicle?.colorCode && (
                          <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                            Код фарби: {vehicle.colorCode}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clean Works Table by Custom Sections: ONLY titles & prices */}
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-amber-400" />
                          Таблиця найменування робіт (за секціями)
                        </h4>
                        <span className="text-xs text-slate-400 font-mono">
                          Всього робіт: <strong className="text-white">{viewingOrder.works.length}</strong>
                        </span>
                      </div>

                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-semibold">
                            <tr>
                              <th className="p-2.5 w-12 text-center">№</th>
                              <th className="p-2.5">Найменування роботи</th>
                              <th className="p-2.5 text-right w-36">Вартість (₴)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {groupWorksByCategory(viewingOrder.works).map((group, gIdx) => {
                              const meta = getCategoryMeta(group.category);
                              const CatIcon = meta.icon;

                              return (
                                <React.Fragment key={group.category}>
                                  {/* Section Header Row */}
                                  <tr className="bg-slate-950/90 border-t border-b border-slate-800">
                                    <td colSpan={3} className="p-2.5">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className={`p-1 rounded-md ${meta.badge}`}>
                                            <CatIcon className="w-3.5 h-3.5" />
                                          </span>
                                          <span className="font-bold text-sm text-white tracking-wide">
                                            {group.category}:
                                          </span>
                                          <span className="text-[11px] text-slate-400 font-mono">
                                            ({group.works.length} {group.works.length === 1 ? 'робота' : 'робіт'})
                                          </span>
                                        </div>
                                        <div className="text-[11px] font-mono text-slate-400">
                                          Сума по секції:{' '}
                                          <strong className="text-amber-400 font-bold font-mono">
                                            {formatCurrency(group.totalPrice)}
                                          </strong>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Work items under this section */}
                                  {group.works.map((w, wIdx) => (
                                    <tr
                                      key={w.id}
                                      className={`transition-colors ${
                                        wIdx % 2 === 1
                                          ? 'bg-slate-900/30 hover:bg-slate-800/30'
                                          : 'bg-transparent hover:bg-slate-800/30'
                                      }`}
                                    >
                                      <td className="p-2.5 text-center text-slate-500 font-mono text-[11px]">
                                        {gIdx + 1}.{wIdx + 1}
                                      </td>
                                      <td className="p-2.5 text-slate-200">
                                        <div className="font-medium text-slate-100 flex items-center gap-1.5">
                                          <span className="text-slate-500">•</span>
                                          <span>{w.title}</span>
                                        </div>
                                      </td>
                                      <td className="p-2.5 text-right font-mono text-white font-semibold">
                                        {formatCurrency(w.price)}
                                      </td>
                                    </tr>
                                  ))}

                                  {/* Section Subtotal Row */}
                                  <tr className="bg-slate-950/40 text-[11px] border-b border-slate-800/70 text-slate-400 font-medium">
                                    <td colSpan={2} className="p-2 pl-6 italic">
                                      Разом за секцією «{group.category}»:
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-slate-200">
                                      {formatCurrency(group.totalPrice)}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                          {/* Table Grand Totals Footer */}
                          <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-xs">
                            <tr>
                              <td colSpan={2} className="p-2.5 text-white font-bold">
                                Разом по всіх секціях робіт:
                              </td>
                              <td className="p-2.5 text-right font-mono text-amber-400 font-black text-sm">
                                {formatCurrency(summary.totalWorksPrice)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Order Payment Summary Box */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Загальна сума наряду до сплати:</span>
                        <span className="font-bold text-base text-white font-mono">
                          {formatCurrency(viewingOrder.totalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Оплачено клієнтом:</span>
                        <span className="font-bold font-mono">
                          {formatCurrency(viewingOrder.paidAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-rose-400 pt-1.5 border-t border-slate-800">
                        <span className="font-bold">Залишок боргу до сплати:</span>
                        <span className="font-bold text-base font-mono">
                          {formatCurrency(viewingOrder.remainingAmount)}
                        </span>
                      </div>
                    </div>

                    {viewingOrder.notes && (
                      <p className="text-xs text-slate-400 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <strong>Нотатки:</strong> {viewingOrder.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* TAB 2: ЗАРОБІТНЯ ПЛАТА (Окремий простір розрахунку винагород і матеріалів) */}
                {orderModalTab === 'salary' && (
                  <div className="space-y-4">
                    {/* Header Info */}
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Заробітня плата та розрахунок фонду оплати праці
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Дані про зарплати та матеріали винесено в окрему вкладку. Наразі діє базовий розподіл{' '}
                          <strong className="text-amber-300">(Ціна - Матеріали) / 2</strong> (50% підготовщик, 50% маляр).
                        </p>
                      </div>
                    </div>

                    {/* Payroll Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Сума робіт:</span>
                        <span className="text-sm font-black text-white font-mono mt-0.5 block">
                          {formatCurrency(summary.totalWorksPrice)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Матеріали робіт:</span>
                        <span className="text-sm font-black text-blue-400 font-mono mt-0.5 block">
                          {formatCurrency(summary.totalWorkMaterials)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">ЗП Підготовщика:</span>
                        <span className="text-sm font-black text-amber-400 font-mono mt-0.5 block">
                          {formatCurrency(summary.totalHelperSalary)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Частка Маляра:</span>
                        <span className="text-sm font-black text-purple-400 font-mono mt-0.5 block">
                          {formatCurrency(summary.totalPainterSalary)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Разом ЗП (ФОП):</span>
                        <span className="text-sm font-black text-amber-300 font-mono mt-0.5 block">
                          {formatCurrency(summary.totalPayroll)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Прибуток цеху:</span>
                        <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">
                          {formatCurrency(summary.workshopProfit)}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Works Payroll Table */}
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-amber-400" />
                          Відомість нарахування заробітної плати по роботах
                        </h4>
                        <span className="text-xs text-slate-400">
                          База нарахування = Ціна роботи - Матеріали
                        </span>
                      </div>

                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-semibold">
                            <tr>
                              <th className="p-2.5 w-10 text-center">№</th>
                              <th className="p-2.5">Найменування роботи</th>
                              <th className="p-2.5 text-right">Ціна</th>
                              <th className="p-2.5 text-right text-blue-300">Матеріали</th>
                              <th className="p-2.5 text-right">База для ЗП</th>
                              <th className="p-2.5 text-right text-amber-300">Підготовщик (50%)</th>
                              <th className="p-2.5 text-right text-purple-300">Маляр (50%)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {groupWorksByCategory(viewingOrder.works).map((group, gIdx) => {
                              const meta = getCategoryMeta(group.category);
                              const CatIcon = meta.icon;

                              return (
                                <React.Fragment key={group.category}>
                                  {/* Section Header */}
                                  <tr className="bg-slate-950/90 border-t border-b border-slate-800">
                                    <td colSpan={7} className="p-2.5">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className={`p-1 rounded-md ${meta.badge}`}>
                                            <CatIcon className="w-3.5 h-3.5" />
                                          </span>
                                          <span className="font-bold text-sm text-white tracking-wide">
                                            {group.category}
                                          </span>
                                        </div>
                                        <div className="text-[11px] font-mono text-slate-400">
                                          Сума робіт: <strong className="text-white font-bold">{formatCurrency(group.totalPrice)}</strong>
                                          {group.totalMaterialCost > 0 && (
                                            <span className="text-blue-400 ml-1.5">
                                              | Мат: {formatCurrency(group.totalMaterialCost)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Work rows */}
                                  {group.works.map((w, wIdx) => {
                                    const isExceeded = (w.materialCost || 0) > (w.price || 0);
                                    const calc = calculateWorkItemSalary(w.price, w.materialCost);

                                    return (
                                      <tr
                                        key={w.id}
                                        className={`transition-colors ${
                                          isExceeded
                                            ? 'bg-rose-950/20'
                                            : wIdx % 2 === 1
                                            ? 'bg-slate-900/30 hover:bg-slate-800/30'
                                            : 'bg-transparent hover:bg-slate-800/30'
                                        }`}
                                      >
                                        <td className="p-2.5 text-center text-slate-500 font-mono text-[11px]">
                                          {gIdx + 1}.{wIdx + 1}
                                        </td>
                                        <td className="p-2.5 text-slate-200">
                                          <div className="font-medium text-slate-100 flex items-center gap-1.5">
                                            <span className="text-slate-500">•</span>
                                            <span>{w.title}</span>
                                          </div>
                                          {isExceeded && (
                                            <div className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5 ml-2.5">
                                              <AlertTriangle className="w-3 h-3 shrink-0" />
                                              Матеріали перевищують ціну! Зарплата: 0 ₴
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-white font-semibold">
                                          {formatCurrency(w.price)}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-blue-300">
                                          {formatCurrency(w.materialCost || 0)}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-slate-300">
                                          {formatCurrency(Math.max(0, calc.netWorkAmount))}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-amber-300 font-semibold">
                                          {formatCurrency(calc.helperSalary)}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-purple-300 font-semibold">
                                          {formatCurrency(calc.painterSalary)}
                                        </td>
                                      </tr>
                                    );
                                  })}

                                  {/* Subtotal row */}
                                  <tr className="bg-slate-950/40 text-[11px] border-b border-slate-800/70 text-slate-400 font-medium">
                                    <td colSpan={2} className="p-2 pl-6 italic">
                                      Підсумок за секцією «{group.category}»:
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-slate-200">
                                      {formatCurrency(group.totalPrice)}
                                    </td>
                                    <td className="p-2 text-right font-mono text-blue-300">
                                      {formatCurrency(group.totalMaterialCost)}
                                    </td>
                                    <td className="p-2 text-right font-mono text-slate-300">
                                      {formatCurrency(Math.max(0, group.totalPrice - group.totalMaterialCost))}
                                    </td>
                                    <td className="p-2 text-right font-mono text-amber-300/90 font-semibold">
                                      {formatCurrency(group.totalHelperSalary)}
                                    </td>
                                    <td className="p-2 text-right font-mono text-purple-300/90 font-semibold">
                                      {formatCurrency(group.totalPainterSalary)}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                          {/* Footer */}
                          <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-xs">
                            <tr>
                              <td colSpan={2} className="p-2.5 text-white font-bold">
                                Разом по наряду:
                              </td>
                              <td className="p-2.5 text-right font-mono text-white font-black text-sm">
                                {formatCurrency(summary.totalWorksPrice)}
                              </td>
                              <td className="p-2.5 text-right font-mono text-blue-400 font-bold">
                                {formatCurrency(summary.totalWorkMaterials)}
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-200">
                                {formatCurrency(Math.max(0, summary.totalWorksPrice - summary.totalWorkMaterials))}
                              </td>
                              <td className="p-2.5 text-right font-mono text-amber-300 font-bold text-sm">
                                {formatCurrency(summary.totalHelperSalary)}
                              </td>
                              <td className="p-2.5 text-right font-mono text-purple-300 font-bold text-sm">
                                {formatCurrency(summary.totalPainterSalary)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Materials Breakdown Section (Перенесено в ЗП після відомостей нарахування) */}
                    {viewingOrder.materials && viewingOrder.materials.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <Boxes className="w-4 h-4 text-amber-400" />
                            Витрачені матеріали та деталі наряду ({viewingOrder.materials.length})
                          </h4>
                          <span className="text-xs text-blue-400 font-mono font-semibold">
                            Разом матеріалів: {formatCurrency(summary.totalOrderMaterials)}
                          </span>
                        </div>
                        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-semibold">
                              <tr>
                                <th className="p-2.5 w-10 text-center">№</th>
                                <th className="p-2.5">Найменування матеріалу</th>
                                <th className="p-2.5 text-center">Кількість</th>
                                <th className="p-2.5 text-right">Ціна за од.</th>
                                <th className="p-2.5 text-right">Загальна сума</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {viewingOrder.materials.map((m, mIdx) => (
                                <tr
                                  key={m.id}
                                  className={`transition-colors ${
                                    mIdx % 2 === 1 ? 'bg-slate-900/30' : 'bg-transparent'
                                  } hover:bg-slate-800/30`}
                                >
                                  <td className="p-2.5 text-center text-slate-500 font-mono text-[11px]">
                                    {mIdx + 1}
                                  </td>
                                  <td className="p-2.5 text-slate-200 font-medium">{m.name}</td>
                                  <td className="p-2.5 text-center text-slate-400 font-mono">
                                    {m.quantity} {m.unit}
                                  </td>
                                  <td className="p-2.5 text-right text-slate-400 font-mono">
                                    {formatCurrency(m.price)}
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-white font-semibold">
                                    {formatCurrency(m.total)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-900/90 font-bold border-t border-slate-800 text-xs">
                              <tr>
                                <td colSpan={4} className="p-2.5 text-slate-300">
                                  Разом додаткових матеріалів зі складу:
                                </td>
                                <td className="p-2.5 text-right font-mono text-blue-400 font-bold text-sm">
                                  {formatCurrency(summary.totalOrderMaterials)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Bottom Status Banner */}
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
                      <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Вкладку <strong>«Заробітня плата»</strong> підготовлено! Повідомте ваші подальші вказівки
                        щодо логіки закріплення конкретних працівників або зміни нарахувань.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Modal: Quick Payment Recorder */}
      {paymentModalOrder && (
        <Modal
          isOpen={Boolean(paymentModalOrder)}
          onClose={() => setPaymentModalOrder(null)}
          title="Прийом оплати"
          subtitle={`Замовлення ${paymentModalOrder.orderNumber}`}
          maxWidth="md"
        >
          <form onSubmit={submitQuickPayment} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Сума замовлення:</span>
                <span className="text-white font-mono">{formatCurrency(paymentModalOrder.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Вже оплачено:</span>
                <span className="text-emerald-400 font-mono">{formatCurrency(paymentModalOrder.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-rose-400 font-bold pt-1 border-t border-slate-800">
                <span>Поточний борг:</span>
                <span className="font-mono">{formatCurrency(paymentModalOrder.remainingAmount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Сума до внесення (₴) *
              </label>
              <input
                type="number"
                required
                min="1"
                max={paymentModalOrder.remainingAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-lg font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Спосіб оплати
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="cash">Готівка</option>
                <option value="card">На картку</option>
                <option value="iban">Безготівка (IBAN / ФОП)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Коментар до платежу
              </label>
              <input
                type="text"
                placeholder="напр. Остаточний розрахунок при видачі авто"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20"
              >
                Підтвердити оплату
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
