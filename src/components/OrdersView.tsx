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
  Package,
  Check,
  FileText,
  Users,
  UserPlus,
  Car,
  Phone,
} from 'lucide-react';
import { storage } from '../lib/storage';
import {
  Order,
  Client,
  Vehicle,
  InventoryItem,
  OrderStatus,
  OrderWorkItem,
  OrderMaterialItem,
  OrderPartItem,
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
  onSaveClient?: (client: Client) => void;
  onSaveVehicle?: (vehicle: Vehicle) => void;
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
  onSaveClient,
  onSaveVehicle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(selectedOrder || null);
  const [isCreateOpen, setIsCreateOpen] = useState(initialCreateOpen);

  // Quick Client Creation Modal State
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('+380 ');
  const [quickClientNotes, setQuickClientNotes] = useState('');
  const [quickAlsoCreateVehicle, setQuickAlsoCreateVehicle] = useState(true);
  const [quickVehicleMake, setQuickVehicleMake] = useState('');
  const [quickVehicleModel, setQuickVehicleModel] = useState('');
  const [quickVehiclePlate, setQuickVehiclePlate] = useState('');
  const [quickVehicleVin, setQuickVehicleVin] = useState('');
  const [quickVehicleYear, setQuickVehicleYear] = useState('');
  const [quickVehicleColor, setQuickVehicleColor] = useState('');
  const [quickVehicleColorCode, setQuickVehicleColorCode] = useState('');

  // Quick Standalone Vehicle Creation Modal State
  const [showQuickVehicleModal, setShowQuickVehicleModal] = useState(false);
  const [standaloneVehicleClientId, setStandaloneVehicleClientId] = useState('');
  const [standaloneVehicleMake, setStandaloneVehicleMake] = useState('');
  const [standaloneVehicleModel, setStandaloneVehicleModel] = useState('');
  const [standaloneVehiclePlate, setStandaloneVehiclePlate] = useState('');
  const [standaloneVehicleVin, setStandaloneVehicleVin] = useState('');
  const [standaloneVehicleYear, setStandaloneVehicleYear] = useState('');
  const [standaloneVehicleColor, setStandaloneVehicleColor] = useState('');
  const [standaloneVehicleColorCode, setStandaloneVehicleColorCode] = useState('');
  const [standaloneVehicleNotes, setStandaloneVehicleNotes] = useState('');

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
  const [parts, setParts] = useState<OrderPartItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [notes, setNotes] = useState('');

  // Tab for viewing order modal: 'order' (clean work order) vs 'materials' (spent materials) vs 'salary' (dedicated payroll tab)
  const [orderModalTab, setOrderModalTab] = useState<'order' | 'materials' | 'salary'>('order');

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

  const partsTotal = useMemo(() => {
    return parts.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  }, [parts]);

  // Вартість витрачених матеріалів та деталей наряду НЕ додаємо до загальної суми наряду
  const totalCalculated = worksTotal + partsTotal;

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
    setWorks([]);
    setMaterials([]);
    setParts([]);
    setPaidAmount('0');
    setNotes('');
    setShowAddSectionBox(false);
    setNewSectionInput('');
    setEditingSectionName(null);
    setIsCreateOpen(true);
  };

  // Quick Save Client (and optionally vehicle) directly inside the Order form
  const handleSaveQuickClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim()) return;

    const newClient: Client = {
      id: 'client-' + Date.now(),
      name: quickClientName.trim(),
      phone: quickClientPhone.trim() || '+380',
      notes: quickClientNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (onSaveClient) {
      onSaveClient(newClient);
    }
    storage.saveClient(newClient);
    setClientId(newClient.id);

    // If vehicle details are also provided, create and link the vehicle immediately
    if (quickAlsoCreateVehicle && quickVehicleMake.trim()) {
      const newVehicle: Vehicle = {
        id: 'veh-' + (Date.now() + 1),
        clientId: newClient.id,
        make: quickVehicleMake.trim(),
        model: quickVehicleModel.trim(),
        licensePlate: quickVehiclePlate.trim().toUpperCase() || 'БЕЗ НОМЕРА',
        vin: quickVehicleVin.trim().toUpperCase() || 'VIN-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        year: quickVehicleYear ? parseInt(quickVehicleYear, 10) : undefined,
        colorName: quickVehicleColor.trim() || undefined,
        colorCode: quickVehicleColorCode.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      if (onSaveVehicle) {
        onSaveVehicle(newVehicle);
      }
      storage.saveVehicle(newVehicle);
      setVehicleId(newVehicle.id);
    }

    setShowQuickClientModal(false);
    setQuickClientName('');
    setQuickClientPhone('+380 ');
    setQuickClientNotes('');
    setQuickVehicleMake('');
    setQuickVehicleModel('');
    setQuickVehiclePlate('');
    setQuickVehicleVin('');
    setQuickVehicleYear('');
    setQuickVehicleColor('');
    setQuickVehicleColorCode('');
  };

  // Quick Save Standalone Vehicle directly inside the Order form
  const handleSaveStandaloneVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClientId = standaloneVehicleClientId || clientId;
    if (!targetClientId) {
      alert('Будь ласка, спочатку оберіть або створіть клієнта');
      return;
    }
    if (!standaloneVehicleMake.trim()) {
      alert('Будь ласка, вкажіть марку автомобіля');
      return;
    }

    const newVehicle: Vehicle = {
      id: 'veh-' + Date.now(),
      clientId: targetClientId,
      make: standaloneVehicleMake.trim(),
      model: standaloneVehicleModel.trim(),
      licensePlate: standaloneVehiclePlate.trim().toUpperCase() || 'БЕЗ НОМЕРА',
      vin: standaloneVehicleVin.trim().toUpperCase() || 'VIN-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      year: standaloneVehicleYear ? parseInt(standaloneVehicleYear, 10) : undefined,
      colorName: standaloneVehicleColor.trim() || undefined,
      colorCode: standaloneVehicleColorCode.trim() || undefined,
      notes: standaloneVehicleNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (onSaveVehicle) {
      onSaveVehicle(newVehicle);
    }
    storage.saveVehicle(newVehicle);

    setClientId(targetClientId);
    setVehicleId(newVehicle.id);
    setShowQuickVehicleModal(false);

    setStandaloneVehicleMake('');
    setStandaloneVehicleModel('');
    setStandaloneVehiclePlate('');
    setStandaloneVehicleVin('');
    setStandaloneVehicleYear('');
    setStandaloneVehicleColor('');
    setStandaloneVehicleColorCode('');
    setStandaloneVehicleNotes('');
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
      };
    });

    setWorks(sanitizedWorks);
    setMaterials(order.materials && order.materials.length > 0 ? [...order.materials] : []);
    setParts(order.parts && order.parts.length > 0 ? [...order.parts] : []);
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
            id: 'm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
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
        id: 'm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name: '',
        quantity: 1,
        unit: 'шт',
        price: 0,
        total: 0,
      },
    ]);
  };

  const updateMaterial = (id: string, patch: Partial<OrderMaterialItem>) => {
    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, ...patch };
        const q = Number(updated.quantity) || 0;
        const p = Number(updated.price) || 0;
        updated.total = q * p;
        return updated;
      })
    );
  };

  const deleteMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddPart = () => {
    setParts((prev) => [
      ...prev,
      {
        id: 'part-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name: '',
        price: 0,
        delivery: 0,
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
      };
    });

    const finalizedParts = parts.map((part) => {
      const price = Math.max(0, Number(part.price) || 0);
      const delivery = Math.max(0, Number(part.delivery) || 0);
      return {
        ...part,
        name: part.name.trim(),
        price,
        delivery,
        total: price + delivery,
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
      parts: finalizedParts,
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
                        Зарплата:
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-semibold border border-amber-500/25 text-[11px]">
                        👨‍🔧 Підготовщик: {formatCurrency(salarySummary.totalHelperSalary)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-mono text-[11px] border border-blue-500/25">
                        🧪 Матеріали робіт: {formatCurrency(salarySummary.totalWorkMaterials)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      Формула: <span className="text-amber-300 font-semibold">(Ціна - Матеріали) / 2</span>
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

          {/* Client & Vehicle Pickers with Instant Creation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            {/* Client Picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  Клієнт *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setQuickClientName('');
                    setQuickClientPhone('+380 ');
                    setQuickClientNotes('');
                    setQuickAlsoCreateVehicle(true);
                    setQuickVehicleMake('');
                    setQuickVehicleModel('');
                    setQuickVehiclePlate('');
                    setQuickVehicleVin('');
                    setShowQuickClientModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30"
                >
                  <Plus className="w-3.5 h-3.5" /> Створити клієнта
                </button>
              </div>
              <select
                required
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  const matching = vehicles.filter((v) => v.clientId === e.target.value);
                  setVehicleId(matching[0]?.id || '');
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="" disabled>
                  {clients.length === 0 ? '— Немає клієнтів (створіть нового) —' : 'Оберіть клієнта зі списку'}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickClientName('');
                    setQuickClientPhone('+380 ');
                    setQuickClientNotes('');
                    setQuickAlsoCreateVehicle(true);
                    setShowQuickClientModal(true);
                  }}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Створити клієнта в 1 клік
                </button>
              )}
            </div>

            {/* Vehicle Picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-amber-400" />
                  Автомобіль клієнта *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStandaloneVehicleClientId(clientId || (clients[0]?.id || ''));
                    setStandaloneVehicleMake('');
                    setStandaloneVehicleModel('');
                    setStandaloneVehiclePlate('');
                    setStandaloneVehicleVin('');
                    setStandaloneVehicleYear('');
                    setStandaloneVehicleColor('');
                    setStandaloneVehicleColorCode('');
                    setShowQuickVehicleModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30"
                >
                  <Plus className="w-3.5 h-3.5" /> Додати авто
                </button>
              </div>
              <select
                required
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="" disabled>
                  {!clientId
                    ? 'Спочатку оберіть або створіть клієнта'
                    : clientVehicles.length === 0
                    ? 'У клієнта немає авто (додайте авто)'
                    : 'Оберіть автомобіль'}
                </option>
                {clientVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.licensePlate || 'без номера'}) {v.colorCode ? `[${v.colorCode}]` : ''}
                  </option>
                ))}
              </select>
              {clientId && clientVehicles.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStandaloneVehicleClientId(clientId);
                    setShowQuickVehicleModal(true);
                  }}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Додати автомобіль для цього клієнта
                </button>
              )}
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
                                <div className="sm:col-span-5">
                                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                                    Найменування роботи *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Вкажіть назву роботи (напр. Бампер передній...)"
                                    value={work.title}
                                    onChange={(e) => updateWork(work.id, { title: e.target.value })}
                                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                                  />
                                </div>

                                {/* Work price */}
                                <div className="sm:col-span-2">
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
                                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono font-bold text-right focus:outline-none focus:border-amber-500 pr-5"
                                    />
                                    <span className="absolute right-1.5 top-1.5 text-xs text-slate-500">₴</span>
                                  </div>
                                </div>

                                {/* Material Cost */}
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                                    Матеріали (₴)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      placeholder="0"
                                      min="0"
                                      value={work.materialCost || ''}
                                      onChange={(e) =>
                                        updateWork(work.id, {
                                          materialCost: Math.max(0, Number(e.target.value) || 0),
                                        })
                                      }
                                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-rose-300 font-mono text-right focus:outline-none focus:border-amber-500 pr-5"
                                      title="Вартість списаних матеріалів на цю роботу"
                                    />
                                    <span className="absolute right-1.5 top-1.5 text-xs text-slate-500">₴</span>
                                  </div>
                                </div>

                                {/* Helper Salary indicator: (Price - Materials) / 2 */}
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] uppercase font-bold text-amber-300 mb-1">
                                    ЗП підготовщика
                                  </label>
                                  <div
                                    className="px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs font-mono font-bold text-amber-400 text-right"
                                    title={`Розрахунок: (${formatCurrency(work.price || 0)} - ${formatCurrency(work.materialCost || 0)}) / 2`}
                                  >
                                    {formatCurrency(work.helperSalary || 0)}
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

          {/* SECTION: Materials (Витрачені матеріали та деталі наряду) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-blue-400" />
                  Витрачені матеріали та деталі наряду ({materials.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Собівартість матеріалів не додається до загальної суми наряду
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {inventory.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddMaterial(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors focus:outline-none"
                  >
                    <option value="" disabled>
                      + Додати зі складу...
                    </option>
                    {inventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.quantity} {inv.unit} · {inv.price} ₴)
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => handleAddMaterial()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> + Додати матеріал
                </button>
              </div>
            </div>

            {materials.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center">
                <p className="text-xs text-slate-400">
                  Витрачені матеріали ще не додано.{' '}
                  <button
                    type="button"
                    onClick={() => handleAddMaterial()}
                    className="text-blue-400 hover:underline font-semibold"
                  >
                    Додати матеріал
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-slate-400 px-1">
                  <div className="col-span-5">Матеріал</div>
                  <div className="col-span-2 text-center">К-сть / од.</div>
                  <div className="col-span-2 text-right">Ціна (₴)</div>
                  <div className="col-span-2 text-right">Сума (₴)</div>
                  <div className="col-span-1 text-center"></div>
                </div>

                {materials.map((m) => (
                  <div key={m.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder="Назва матеріалу..."
                        value={m.name}
                        onChange={(e) => updateMaterial(m.id, { name: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={m.quantity}
                        onChange={(e) => updateMaterial(m.id, { quantity: Number(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-center font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={m.unit}
                        onChange={(e) => updateMaterial(m.id, { unit: e.target.value })}
                        className="w-10 px-1 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-center text-slate-300 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        value={m.price}
                        onChange={(e) => updateMaterial(m.id, { price: Number(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-right font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2 font-mono font-bold text-blue-400 text-right">
                      {formatCurrency(m.total)}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteMaterial(m.id)}
                      className="col-span-1 p-1 text-slate-500 hover:text-rose-400 text-center transition-colors"
                      title="Видалити матеріал"
                    >
                      <Trash className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                ))}

                <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold">Разом витрачених матеріалів:</span>
                    <span className="text-[10px] text-slate-500">(не додається до загальної суми)</span>
                  </div>
                  <span className="font-mono font-black text-blue-400 text-sm">
                    {formatCurrency(materialsTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION: Parts (Запчастини) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-400" />
                Запчастини ({parts.length}) — Разом: {formatCurrency(partsTotal)}
              </h4>
              <button
                type="button"
                onClick={handleAddPart}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" /> + Додати запчастину
              </button>
            </div>

            {parts.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center">
                <p className="text-xs text-slate-400">
                  Запчастини ще не додано.{' '}
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="text-amber-400 hover:underline font-semibold"
                  >
                    Додати першу запчастину
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-slate-400 px-1">
                  <div className="col-span-5">Назва запчастини</div>
                  <div className="col-span-2 text-right">Ціна (₴)</div>
                  <div className="col-span-2 text-right">Доставка (₴)</div>
                  <div className="col-span-2 text-right">Сума (₴)</div>
                  <div className="col-span-1 text-center"></div>
                </div>

                {parts.map((part, index) => (
                  <div key={part.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                    <input
                      type="text"
                      required
                      placeholder="напр. Бампер передній, Фара ліва"
                      value={part.name}
                      onChange={(e) => {
                        const updated = [...parts];
                        updated[index].name = e.target.value;
                        setParts(updated);
                      }}
                      className="col-span-5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <div className="col-span-2 relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="Ціна"
                        value={part.price || ''}
                        onChange={(e) => {
                          const updated = [...parts];
                          const p = Number(e.target.value) || 0;
                          updated[index].price = p;
                          updated[index].total = p + (Number(updated[index].delivery) || 0);
                          setParts(updated);
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-right focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="Доставка"
                        value={part.delivery || ''}
                        onChange={(e) => {
                          const updated = [...parts];
                          const d = Number(e.target.value) || 0;
                          updated[index].delivery = d;
                          updated[index].total = (Number(updated[index].price) || 0) + d;
                          setParts(updated);
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-right focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 font-mono font-bold text-amber-400 text-right">
                      {formatCurrency(part.total)}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setParts(parts.filter((_, i) => i !== index));
                      }}
                      className="col-span-1 p-1 text-slate-500 hover:text-rose-400 text-center transition-colors"
                      title="Видалити запчастину"
                    >
                      <Trash className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                ))}

                <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                  <span className="text-slate-400 font-semibold">Загальна сума запчастин:</span>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    {formatCurrency(partsTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment & Totals Section */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Вартість робіт:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(worksTotal)}</span>
              </div>
              {partsTotal > 0 && (
                <div className="flex items-center justify-between text-slate-300">
                  <span>Вартість запчастин:</span>
                  <span className="font-mono font-bold text-amber-400">{formatCurrency(partsTotal)}</span>
                </div>
              )}
              {materialsTotal > 0 && (
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Витрачені матеріали (не додаються до суми наряду):</span>
                  <span className="font-mono text-blue-400 font-semibold">{formatCurrency(materialsTotal)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-slate-200 font-bold block">Загальна сума до оплати клієнтом:</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  (сума матеріалів не додається до наряду)
                </span>
              </div>
              <span className="text-xl font-black text-white font-mono">{formatCurrency(totalCalculated)}</span>
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
                <div className="flex border-b border-slate-800 -mt-2 gap-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setOrderModalTab('order')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
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
                    onClick={() => setOrderModalTab('materials')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                      orderModalTab === 'materials'
                        ? 'border-blue-400 text-blue-400 bg-blue-400/5'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Boxes className="w-4 h-4" />
                    Витрачені матеріали
                    {viewingOrder.materials && viewingOrder.materials.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono font-bold">
                        {viewingOrder.materials.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderModalTab('salary')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
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

                    {/* Order Parts Breakdown (if any parts exist) */}
                    {viewingOrder.parts && viewingOrder.parts.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-amber-400" />
                            Запчастини ({viewingOrder.parts.length})
                          </h4>
                          <span className="text-xs font-mono font-bold text-amber-400">
                            Разом: {formatCurrency(viewingOrder.parts.reduce((sum, p) => sum + (Number(p.total) || 0), 0))}
                          </span>
                        </div>
                        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-semibold">
                              <tr>
                                <th className="p-2.5 w-10 text-center">№</th>
                                <th className="p-2.5">Назва запчастини</th>
                                <th className="p-2.5 text-right">Ціна</th>
                                <th className="p-2.5 text-right">Доставка</th>
                                <th className="p-2.5 text-right">Сума</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {viewingOrder.parts.map((p, pIdx) => (
                                <tr
                                  key={p.id}
                                  className={`transition-colors ${
                                    pIdx % 2 === 1 ? 'bg-slate-900/30' : 'bg-transparent'
                                  } hover:bg-slate-800/30`}
                                >
                                  <td className="p-2.5 text-center text-slate-500 font-mono text-[11px]">
                                    {pIdx + 1}
                                  </td>
                                  <td className="p-2.5 text-slate-200 font-medium">{p.name}</td>
                                  <td className="p-2.5 text-right text-slate-400 font-mono">
                                    {formatCurrency(p.price)}
                                  </td>
                                  <td className="p-2.5 text-right text-slate-400 font-mono">
                                    {formatCurrency(p.delivery)}
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-amber-400 font-semibold">
                                    {formatCurrency(p.total)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-900/90 font-bold border-t border-slate-800 text-xs">
                              <tr>
                                <td colSpan={4} className="p-2.5 text-slate-300">
                                  Разом запчастин:
                                </td>
                                <td className="p-2.5 text-right font-mono text-amber-400 font-bold text-sm">
                                  {formatCurrency(viewingOrder.parts.reduce((sum, p) => sum + (Number(p.total) || 0), 0))}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Order Payment Summary Box */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Сума робіт:</span>
                        <span className="font-bold font-mono text-slate-200">
                          {formatCurrency(summary.totalWorksPrice)}
                        </span>
                      </div>
                      {viewingOrder.parts && viewingOrder.parts.length > 0 && (
                        <div className="flex justify-between text-slate-400">
                          <span>Запчастини:</span>
                          <span className="font-bold font-mono text-amber-400">
                            {formatCurrency(viewingOrder.parts.reduce((sum, p) => sum + (Number(p.total) || 0), 0))}
                          </span>
                        </div>
                      )}
                      {viewingOrder.materials && viewingOrder.materials.length > 0 && (
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Витрачені матеріали (не додаються до суми наряду):</span>
                          <span className="font-mono text-blue-400">
                            {formatCurrency(summary.totalOrderMaterials)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-200 pt-1.5 border-t border-slate-800 font-semibold">
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

                {/* TAB 2: ВИТРАЧЕНІ МАТЕРІАЛИ (Вкладка Витрачені матеріали та деталі наряду) */}
                {orderModalTab === 'materials' && (
                  <div className="space-y-4">
                    {/* Header Info Banner */}
                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 shrink-0 mt-0.5">
                        <Boxes className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Витрачені матеріали та деталі наряду
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Облік витрачених матеріалів та компонентів цеху на замовлення.{' '}
                          <strong className="text-blue-300">
                            Вартість витрачених матеріалів не додається до загальної суми наряду для клієнта.
                          </strong>
                        </p>
                      </div>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Кількість позицій:</span>
                        <span className="text-sm font-black text-white font-mono mt-0.5 block">
                          {(viewingOrder.materials || []).length} поз.
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Сума матеріалів:</span>
                        <span className="text-sm font-black text-blue-400 font-mono mt-0.5 block">
                          {formatCurrency(summary.totalOrderMaterials)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Матеріали в роботах (ЗП):</span>
                        <span className="text-sm font-black text-slate-200 font-mono mt-0.5 block">
                          {formatCurrency(summary.totalWorkMaterials)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-300 block uppercase font-bold">Включено в чек:</span>
                        <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">
                          0 ₴ (не додається)
                        </span>
                      </div>
                    </div>

                    {/* Materials Table */}
                    {(!viewingOrder.materials || viewingOrder.materials.length === 0) ? (
                      <div className="p-8 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-2">
                        <Boxes className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-sm font-semibold text-slate-300">
                          У цьому наряді немає зафіксованих витрачених матеріалів
                        </p>
                        <p className="text-xs text-slate-500">
                          Матеріали можна додати під час створення або редагування наряду зі складу або вручну.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                            <Boxes className="w-4 h-4 text-blue-400" />
                            Перелік витрачених матеріалів та деталей наряду ({viewingOrder.materials.length})
                          </h4>
                          <span className="text-xs text-blue-400 font-mono font-semibold">
                            Разом: {formatCurrency(summary.totalOrderMaterials)}
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
                                  <td className="p-2.5 text-slate-200 font-medium">
                                    <div className="flex items-center gap-1.5">
                                      <span>{m.name}</span>
                                      {m.inventoryId && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-blue-300 border border-slate-700 font-mono">
                                          Склад
                                        </span>
                                      )}
                                    </div>
                                  </td>
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
                                  Разом витрачених матеріалів (не додається до суми наряду):
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

                    {/* Notice */}
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>
                        Суму за «Витрачені матеріали та деталі наряду» <strong>не додано</strong> до загальної вартості наряду для клієнта.
                      </span>
                    </div>
                  </div>
                )}

                {/* TAB 3: ЗАРОБІТНЯ ПЛАТА (Окремий простір розрахунку винагород) */}
                {orderModalTab === 'salary' && (
                  <div className="space-y-4">
                    {/* Header Info */}
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Заробітна плата підготовщика
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Розрахунок зарплати підготовщика за формулою:{' '}
                          <strong className="text-amber-300">(Ціна роботи - Матеріали) / 2</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Payroll Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
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
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">База для ЗП:</span>
                        <span className="text-sm font-black text-slate-200 font-mono mt-0.5 block">
                          {formatCurrency(Math.max(0, summary.totalWorksPrice - summary.totalWorkMaterials))}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <span className="text-[10px] text-amber-300 block uppercase font-bold">ЗП Підготовщика (50%):</span>
                        <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">
                          {formatCurrency(summary.totalHelperSalary)}
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
                                    <td colSpan={6} className="p-2.5">
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
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Bottom Status Banner */}
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
                      <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Розрахунок винагороди: нараховується <strong>лише зарплата підготовщика (50% від чистої вартості роботи після вирахування матеріалів)</strong>.
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

      {/* Modal: Quick Create Client (with optional instant vehicle) */}
      {showQuickClientModal && (
        <Modal
          isOpen={showQuickClientModal}
          onClose={() => setShowQuickClientModal(false)}
          title="Створення нового клієнта"
          subtitle="Клієнт та його автомобіль автоматично збережуться в базі та виберуться в наряді"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveQuickClient} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  ПІБ / Назва клієнта *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Коваленко Олександр Іванович"
                  value={quickClientName}
                  onChange={(e) => setQuickClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Номер телефону *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+380 67 123 45 67"
                  value={quickClientPhone}
                  onChange={(e) => setQuickClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Нотатки про клієнта
                </label>
                <input
                  type="text"
                  placeholder="напр. Постійний клієнт, рекомендація"
                  value={quickClientNotes}
                  onChange={(e) => setQuickClientNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Optional Immediate Vehicle Section */}
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={quickAlsoCreateVehicle}
                    onChange={(e) => setQuickAlsoCreateVehicle(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 focus:ring-offset-slate-950"
                  />
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-amber-400" />
                    Одразу створити автомобіль для цього клієнта
                  </span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {quickAlsoCreateVehicle ? 'Авто закріпиться за нарядом' : 'Тільки клієнт'}
                </span>
              </div>

              {quickAlsoCreateVehicle && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Марка авто *
                      </label>
                      <input
                        type="text"
                        placeholder="напр. BMW, Toyota..."
                        value={quickVehicleMake}
                        onChange={(e) => setQuickVehicleMake(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Модель авто
                      </label>
                      <input
                        type="text"
                        placeholder="напр. X5, Camry, Golf..."
                        value={quickVehicleModel}
                        onChange={(e) => setQuickVehicleModel(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Держномер *
                      </label>
                      <input
                        type="text"
                        placeholder="напр. KA 1234 BT"
                        value={quickVehiclePlate}
                        onChange={(e) => setQuickVehiclePlate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 uppercase font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        VIN-код (номер кузова)
                      </label>
                      <input
                        type="text"
                        placeholder="WBA... (необов'язково)"
                        value={quickVehicleVin}
                        onChange={(e) => setQuickVehicleVin(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Колір
                      </label>
                      <input
                        type="text"
                        placeholder="Чорний, Сірий..."
                        value={quickVehicleColor}
                        onChange={(e) => setQuickVehicleColor(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Код фарби
                      </label>
                      <input
                        type="text"
                        placeholder="LC9X, 1F7..."
                        value={quickVehicleColorCode}
                        onChange={(e) => setQuickVehicleColorCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowQuickClientModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Зберегти та обрати в наряд
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Quick Create Standalone Vehicle */}
      {showQuickVehicleModal && (
        <Modal
          isOpen={showQuickVehicleModal}
          onClose={() => setShowQuickVehicleModal(false)}
          title="Додавання автомобіля"
          subtitle="Автомобіль збережеться у базі та закріпиться за цим нарядом"
          maxWidth="md"
        >
          <form onSubmit={handleSaveStandaloneVehicle} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Власник автомобіля (клієнт) *
              </label>
              <select
                required
                value={standaloneVehicleClientId || clientId}
                onChange={(e) => setStandaloneVehicleClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Марка авто *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Audi, BMW, Skoda"
                  value={standaloneVehicleMake}
                  onChange={(e) => setStandaloneVehicleMake(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Модель авто
                </label>
                <input
                  type="text"
                  placeholder="напр. A6, Octavia A7"
                  value={standaloneVehicleModel}
                  onChange={(e) => setStandaloneVehicleModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Держномер *
                </label>
                <input
                  type="text"
                  placeholder="напр. AA 9900 BB"
                  value={standaloneVehiclePlate}
                  onChange={(e) => setStandaloneVehiclePlate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Рік випуску
                </label>
                <input
                  type="number"
                  placeholder="напр. 2018"
                  min="1950"
                  max={new Date().getFullYear() + 1}
                  value={standaloneVehicleYear}
                  onChange={(e) => setStandaloneVehicleYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Колір
                </label>
                <input
                  type="text"
                  placeholder="напр. Сірий металік"
                  value={standaloneVehicleColor}
                  onChange={(e) => setStandaloneVehicleColor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Код фарби (для підбору)
                </label>
                <input
                  type="text"
                  placeholder="напр. LY9B, 475"
                  value={standaloneVehicleColorCode}
                  onChange={(e) => setStandaloneVehicleColorCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                VIN-код (номер кузова)
              </label>
              <input
                type="text"
                placeholder="17 символів кузова (необов'язково)"
                value={standaloneVehicleVin}
                onChange={(e) => setStandaloneVehicleVin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Нотатки
              </label>
              <input
                type="text"
                placeholder="Особливості комплектації чи стану"
                value={standaloneVehicleNotes}
                onChange={(e) => setStandaloneVehicleNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowQuickVehicleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Зберегти автомобіль
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
