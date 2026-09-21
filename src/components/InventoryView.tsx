import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Package,
  PackageMinus,
  PackagePlus,
  Layers,
  ClipboardCheck,
  Sparkles,
} from 'lucide-react';
import { InventoryItem, InventoryCategory } from '../types';
import { Modal } from './Modal';
import { formatCurrency, INVENTORY_CATEGORIES } from '../lib/formatters';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onSaveItem: (item: InventoryItem) => void;

  onDeleteItem: (id: string) => void;
}

interface ReceiptLine {
  id: string;
  quantity: string;
  price: string;
}

interface ReceiptRecord {
  id: string;
  number: string;
  createdAt: string;
  date: string;
  invoice: string;
  supplier: string;
  supplierPhone: string;
  manager: string;
  warehouse: string;
  comment: string;
  total: number;
  paidFromAccount: boolean;
  status: 'created' | 'draft';
  items: Array<{ name: string; quantity: number; unit: string; price: number; total: number }>;
}

interface WriteoffRecord {
  id: string;
  number: string;
  createdAt: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  total: number;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onSaveItem,
  onDeleteItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'empty'>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [activeSection, setActiveSection] = useState<'stock' | 'receipt' | 'writeoff' | 'inventory'>('stock');
  const [isReceiptFormOpen, setIsReceiptFormOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRecord | null>(null);
  const [isWriteoffFormOpen, setIsWriteoffFormOpen] = useState(false);
  const [receiptRecords, setReceiptRecords] = useState<ReceiptRecord[]>(() => {
    try {
      const saved = localStorage.getItem('autopaint_crm_receipts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [writeoffRecords, setWriteoffRecords] = useState<WriteoffRecord[]>(() => {
    try {
      const saved = localStorage.getItem('autopaint_crm_writeoffs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [movementItemId, setMovementItemId] = useState('');
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementPrice, setMovementPrice] = useState('');
  const [movementNote, setMovementNote] = useState('');
  const [movementMessage, setMovementMessage] = useState<string | null>(null);
  const [receiptSupplier, setReceiptSupplier] = useState('');
  const [receiptSupplierPhone, setReceiptSupplierPhone] = useState('');
  const [receiptManager, setReceiptManager] = useState('');
  const [receiptInvoice, setReceiptInvoice] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptWarehouse, setReceiptWarehouse] = useState('Основний склад');
  const [receiptComment, setReceiptComment] = useState('');
  const [receiptPayFromAccount, setReceiptPayFromAccount] = useState(false);
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([]);
  const [receiptProductId, setReceiptProductId] = useState('');
  const [receiptProductQuantity, setReceiptProductQuantity] = useState('');
  const [receiptProductPrice, setReceiptProductPrice] = useState('');
  const [countItemId, setCountItemId] = useState('');
  const [countQuantity, setCountQuantity] = useState('');
  const [countNote, setCountNote] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('clearcoats');
  const [unit, setUnit] = useState('шт');
  const [quantity, setQuantity] = useState<string>('1');
  const [minQuantity, setMinQuantity] = useState<string>('1');
  const [price, setPrice] = useState<string>('0');
  const [retailPrice, setRetailPrice] = useState<string>('0');
  const [servicePrice, setServicePrice] = useState<string>('0');
  const [warrantyMonths, setWarrantyMonths] = useState<string>('0');
  const [expirationDate, setExpirationDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  // Stats
  const totalValue = useMemo(() => {
    return inventory.reduce((acc, curr) => acc + curr.quantity * curr.price, 0);
  }, [inventory]);

  const lowStockCount = useMemo(() => {
    return inventory.filter((i) => i.quantity <= i.minQuantity).length;
  }, [inventory]);

  const receiptTotal = useMemo(() => {
    return receiptLines.reduce(
      (sum, line) => sum + (Number(line.price) || 0) * (Number(line.quantity) || 0),
      0,
    );
  }, [receiptLines]);

  // Filter items
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.supplier && item.supplier.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesLow = !showLowStockOnly || item.quantity <= item.minQuantity;
      const matchesAvailability = availabilityFilter === 'all'
        || (availabilityFilter === 'available' && item.quantity > 0)
        || (availabilityFilter === 'empty' && item.quantity <= 0);

      return matchesSearch && matchesCat && matchesLow && matchesAvailability;
    });
  }, [inventory, searchQuery, categoryFilter, showLowStockOnly, availabilityFilter]);

  const openCreateModal = () => {
    setName('');
    setSku('');
    setImageUrl('');
    setCategory('clearcoats');
    setUnit('л');
    setQuantity('1');
    setMinQuantity('2');
    setPrice('500');
    setRetailPrice('0');
    setServicePrice('0');
    setWarrantyMonths('0');
    setExpirationDate('');
    setSupplier('');
    setNotes('');
    setIsCreateOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku || '');
    setImageUrl(item.imageUrl || '');
    setCategory(item.category);
    setUnit(item.unit);
    setQuantity(String(item.quantity));
    setMinQuantity(String(item.minQuantity));
    setPrice(String(item.price));
    setRetailPrice(String(item.retailPrice ?? item.price));
    setServicePrice(String(item.servicePrice ?? item.retailPrice ?? item.price));
    setWarrantyMonths(String(item.warrantyMonths ?? 0));
    setExpirationDate(item.expirationDate || '');
    setSupplier(item.supplier || '');
    setNotes(item.notes || '');
  };

  const handleQuickAdjust = (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    onSaveItem({
      ...item,
      quantity: Math.round(newQty * 10) / 10,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleMovement = (event: React.FormEvent) => {
    event.preventDefault();
    const item = inventory.find((entry) => entry.id === movementItemId);
    const amount = Number(movementQuantity);
    if (!item || !amount || amount <= 0) return;

    if (activeSection === 'writeoff' && amount > item.quantity) {
      setMovementMessage(`Недостатньо залишку. Доступно лише ${item.quantity} ${item.unit}.`);
      return;
    }

    const nextQuantity = activeSection === 'receipt'
      ? item.quantity + amount
      : item.quantity - amount;

    onSaveItem({
      ...item,
      quantity: Math.round(nextQuantity * 100) / 100,
      price: activeSection === 'receipt' && Number(movementPrice) > 0
        ? Number(movementPrice)
        : item.price,
      updatedAt: new Date().toISOString(),
      notes: movementNote.trim() || item.notes,
    });

    if (activeSection === 'writeoff') {
      const record: WriteoffRecord = {
        id: `writeoff-${Date.now()}`,
        number: String(100 + writeoffRecords.length + 1),
        createdAt: new Date().toISOString(),
        itemName: item.name,
        quantity: amount,
        unit: item.unit,
        reason: movementNote.trim() || 'Списання матеріалу',
        total: amount * item.price,
      };
      const nextRecords = [record, ...writeoffRecords];
      setWriteoffRecords(nextRecords);
      localStorage.setItem('autopaint_crm_writeoffs', JSON.stringify(nextRecords));
      setIsWriteoffFormOpen(false);
    }

    setMovementMessage(
      `${activeSection === 'receipt' ? 'Оприбутковано' : 'Списано'} ${amount} ${item.unit}: ${item.name}`
    );
    setMovementQuantity('');
    setMovementPrice('');
    setMovementNote('');
  };

  const addReceiptLine = () => {
    const item = inventory.find((entry) => entry.id === receiptProductId);
    const amount = Number(receiptProductQuantity);
    if (!item || !amount || amount <= 0) return;

    setReceiptLines((lines) => [
      ...lines,
      {
        id: item.id,
        quantity: String(amount),
        price: receiptProductPrice || String(item.price),
      },
    ]);
    setReceiptProductId('');
    setReceiptProductQuantity('');
    setReceiptProductPrice('');
  };

  const handleReceiptSubmit = (event: React.FormEvent | React.MouseEvent, status: ReceiptRecord['status'] = 'created') => {
    event.preventDefault();
    if (!receiptSupplier.trim() || (status === 'created' && receiptLines.length === 0)) return;

    const record: ReceiptRecord = {
      id: `receipt-${Date.now()}`,
      number: String(100 + receiptRecords.length + 1),
      createdAt: new Date().toISOString(),
      date: receiptDate,
      invoice: receiptInvoice,
      supplier: receiptSupplier.trim(),
      supplierPhone: receiptSupplierPhone.trim(),
      manager: receiptManager.trim(),
      warehouse: receiptWarehouse,
      comment: receiptComment.trim(),
      total: receiptTotal,
      paidFromAccount: receiptPayFromAccount,
      status,
      items: receiptLines.map((line) => {
        const item = inventory.find((entry) => entry.id === line.id);
        const price = Number(line.price) || item?.price || 0;
        const quantity = Number(line.quantity) || 0;
        return { name: item?.name || 'Товар', quantity, unit: item?.unit || 'од.', price, total: quantity * price };
      }),
    };

    if (status === 'created') {
      receiptLines.forEach((line) => {
        const item = inventory.find((entry) => entry.id === line.id);
        if (!item) return;
        const amount = Number(line.quantity) || 0;
        const purchasePrice = Number(line.price) || item.price;
        onSaveItem({
          ...item,
          quantity: Math.round((item.quantity + amount) * 100) / 100,
          price: purchasePrice,
          supplier: receiptSupplier.trim(),
          notes: receiptComment.trim() || item.notes,
          updatedAt: new Date().toISOString(),
        });
      });
    }

    const nextRecords = [record, ...receiptRecords];
    setReceiptRecords(nextRecords);
    localStorage.setItem('autopaint_crm_receipts', JSON.stringify(nextRecords));

    setMovementMessage(status === 'draft'
      ? 'Документ збережено як чернетку.'
      : `Оприбуткування ${receiptInvoice ? `№${receiptInvoice} ` : ''}проведено: ${receiptLines.length} позицій.`);
    setReceiptLines([]);
    setReceiptSupplier('');
    setReceiptSupplierPhone('');
    setReceiptManager('');
    setReceiptInvoice('');
    setReceiptComment('');
    setReceiptPayFromAccount(false);
    setIsReceiptFormOpen(false);
  };

  const handleInventoryCount = (event: React.FormEvent) => {
    event.preventDefault();
    const item = inventory.find((entry) => entry.id === countItemId);
    const countedQuantity = Number(countQuantity);
    if (!item || Number.isNaN(countedQuantity) || countedQuantity < 0) return;

    const difference = countedQuantity - item.quantity;
    onSaveItem({
      ...item,
      quantity: Math.round(countedQuantity * 100) / 100,
      updatedAt: new Date().toISOString(),
      notes: countNote.trim() || item.notes,
    });
    setMovementMessage(`Інвентаризацію проведено: ${item.name}. Різниця ${difference >= 0 ? '+' : ''}${difference} ${item.unit}.`);
    setCountQuantity('');
    setCountNote('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : 'inv-' + Date.now(),
      name: name.trim(),
      sku: sku.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      category,
      unit: unit.trim(),
      quantity: Number(quantity) || 0,
      minQuantity: Number(minQuantity) || 1,
      price: Number(price) || 0,
      retailPrice: Number(retailPrice) || 0,
      servicePrice: Number(servicePrice) || 0,
      warrantyMonths: Number(warrantyMonths) || 0,
      expirationDate: expirationDate || undefined,
      supplier: supplier.trim() || undefined,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveItem(newItem);
    setIsCreateOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-400" />
            Склад малярних матеріалів
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Облік залишків фарб, лаків, ґрунтів, шпаклівок, абразивів та витратників
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          Додати матеріал
        </button>
      </div>

      <div className="-mx-4 overflow-x-auto border-y border-slate-800 bg-[#0d131d] px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex min-w-max items-center gap-1">
        {[
          { id: 'stock', label: 'Залишки', icon: Boxes },
          { id: 'receipt', label: 'Оприбуткування', icon: PackagePlus },
          { id: 'writeoff', label: 'Списання', icon: PackageMinus },
          { id: 'inventory', label: 'Інвентаризація', icon: ClipboardCheck },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActiveSection(id as 'stock' | 'receipt' | 'writeoff' | 'inventory');
              setMovementMessage(null);
              if (id !== 'receipt') setIsReceiptFormOpen(false);
              if (id !== 'writeoff') setIsWriteoffFormOpen(false);
            }}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeSection === id
                ? id === 'writeoff'
                  ? 'border-rose-400 text-rose-300'
                  : id === 'receipt'
                    ? 'border-emerald-400 text-emerald-300'
                    : id === 'inventory'
                      ? 'border-sky-400 text-sky-300'
                      : 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
        </div>
      </div>

      {activeSection === 'receipt' && !isReceiptFormOpen && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Оприбутковуйте товари на склад, щоб вести їх облік, відстежувати залишки та історію рухів.</p>
            </div>
            <button type="button" onClick={() => { setMovementMessage(null); setIsReceiptFormOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition-colors hover:bg-emerald-400">
              <Plus className="h-4 w-4" />
              Оприбуткування
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-xl shadow-black/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-[#131b2c] text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Оприбуткування</th>
                    <th className="px-4 py-3 font-semibold">Створено</th>
                    <th className="px-4 py-3 font-semibold">Оновлено</th>
                    <th className="px-4 py-3 font-semibold">Накладна</th>
                    <th className="px-4 py-3 font-semibold">Постачальник</th>
                    <th className="px-4 py-3 font-semibold">Менеджер</th>
                    <th className="px-4 py-3 font-semibold">Склад</th>
                    <th className="px-4 py-3 font-semibold">Коментар</th>
                    <th className="px-4 py-3 font-semibold">Статус</th>
                    <th className="px-4 py-3 text-right font-semibold">Сума, грн</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {receiptRecords.length === 0 ? (
                    <tr><td colSpan={10} className="px-6 py-16 text-center text-slate-500">Оприбуткувань ще немає. Створіть перший документ.</td></tr>
                  ) : receiptRecords.map((receipt) => (
                    <tr key={receipt.id} onClick={() => setSelectedReceipt(receipt)} className="cursor-pointer transition-colors hover:bg-slate-900/60">
                      <td className="px-4 py-3 font-semibold text-emerald-300">{receipt.number}</td>
                      <td className="px-4 py-3 text-slate-300">{new Date(receipt.createdAt).toLocaleDateString('uk-UA')}<span className="block text-xs text-slate-500">{new Date(receipt.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span></td>
                      <td className="px-4 py-3 text-slate-400">{new Date(receipt.createdAt).toLocaleDateString('uk-UA')}</td>
                      <td className="px-4 py-3 text-slate-300">{receipt.invoice || '—'}</td>
                      <td className="px-4 py-3 font-medium text-white">{receipt.supplier}<span className="block text-xs text-slate-500">{receipt.supplierPhone || '—'}</span></td>
                      <td className="px-4 py-3 text-slate-300">{receipt.manager || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{receipt.warehouse}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-slate-400">{receipt.comment || '—'}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${receipt.status === 'draft' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{receipt.status === 'draft' ? 'Чернетка' : 'Створено'}</span></td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">{formatCurrency(receipt.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setSelectedReceipt(null)}>
          <aside className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-800 bg-[#111827] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-800 bg-[#131b2c] px-5 py-4">
              <div>
                <h2 className="text-xl font-bold text-white">Оприбуткування {selectedReceipt.number}</h2>
                <p className="mt-1 text-xs text-slate-400">Створено: {new Date(selectedReceipt.createdAt).toLocaleString('uk-UA')}</p>
              </div>
              <button type="button" onClick={() => setSelectedReceipt(null)} className="rounded-lg p-2 text-2xl leading-none text-slate-400 hover:bg-slate-800 hover:text-white" title="Закрити">×</button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Постачальник</p>
                <p className="mt-2 font-semibold text-sky-300">{selectedReceipt.supplier}</p>
                <p className="mt-1 text-sm text-slate-400">{selectedReceipt.supplierPhone || 'Телефон не вказано'}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-800 pt-3 text-sm">
                  <span className="text-slate-500">Менеджер</span><span className="text-right text-slate-200">{selectedReceipt.manager || '—'}</span>
                  <span className="text-slate-500">Баланс</span><span className="text-right font-semibold text-rose-300">{selectedReceipt.paidFromAccount ? 'Оплачено' : `До сплати ${formatCurrency(selectedReceipt.total)}`}</span>
                </div>
              </div>

              <div className="text-sm text-slate-300"><span className="text-slate-500">Склад:</span> {selectedReceipt.warehouse}</div>
              <div>
                <h3 className="mb-3 text-base font-bold text-white">Список товарів</h3>
                <div className="overflow-hidden rounded-xl border border-slate-800">
                  <div className="grid grid-cols-[minmax(0,1fr)_90px_80px_100px] bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><span>Найменування</span><span>Ціна</span><span>К-сть</span><span className="text-right">Сума</span></div>
                  {(selectedReceipt.items || []).map((item, index) => <div key={`${item.name}-${index}`} className="grid grid-cols-[minmax(0,1fr)_90px_80px_100px] border-t border-slate-800 px-3 py-3 text-sm"><span className="pr-2 text-sky-300">{item.name}</span><span className="text-slate-300">{formatCurrency(item.price)}</span><span className="text-slate-300">{item.quantity} {item.unit}</span><span className="text-right font-semibold text-white">{formatCurrency(item.total)}</span></div>)}
                  {(selectedReceipt.items || []).length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-500">Позиції не збережені в цьому документі.</div>}
                </div>
                <div className="mt-3 flex justify-end border-t border-slate-800 pt-3 text-sm"><span className="text-slate-400">Разом:</span><strong className="ml-3 text-lg text-white">{formatCurrency(selectedReceipt.total)}</strong></div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Коментар</p>
                <div className="min-h-20 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-300">{selectedReceipt.comment || 'Коментар відсутній'}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-[#0d131d] px-5 py-3">
              <button type="button" onClick={() => setSelectedReceipt(null)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-white">Закрити</button>
              <button type="button" className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600">Дії</button>
            </div>
          </aside>
        </div>
      )}

      {activeSection === 'receipt' && isReceiptFormOpen && (
        <form onSubmit={handleReceiptSubmit} className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] text-slate-200 shadow-2xl shadow-black/20">
          <div className="border-b border-slate-800 bg-[#131b2c] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
                <PackagePlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Нове оприбуткування</h2>
                <p className="mt-0.5 text-xs text-slate-400">Документ надходження товарів на склад</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Постачальник <span className="text-rose-500">*</span>
                <input
                  required
                  value={receiptSupplier}
                  onChange={(event) => setReceiptSupplier(event.target.value)}
                  placeholder="Введіть постачальника"
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-normal text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Телефон постачальника
                <input value={receiptSupplierPhone} onChange={(event) => setReceiptSupplierPhone(event.target.value)} placeholder="+380 (__) ___ __ __" className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-normal text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Менеджер
                <input value={receiptManager} onChange={(event) => setReceiptManager(event.target.value)} placeholder="Відповідальний менеджер" className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-normal text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Склад <span className="text-rose-500">*</span>
                <select value={receiptWarehouse} onChange={(event) => setReceiptWarehouse(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-normal text-white outline-none focus:border-emerald-500">
                  <option>Основний склад</option>
                  <option>Склад малярних матеріалів</option>
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Номер накладної
                <input value={receiptInvoice} onChange={(event) => setReceiptInvoice(event.target.value)} placeholder="№ накладної" className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-normal text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Дата
                <input type="date" value={receiptDate} onChange={(event) => setReceiptDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-normal text-white outline-none focus:border-emerald-500" />
              </label>
            </div>

            <div>
              <h3 className="mb-3 text-base font-bold text-white">Список товарів</h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_140px_140px_auto]">
                <select value={receiptProductId} onChange={(event) => setReceiptProductId(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                  <option value="">Оберіть товар зі складу</option>
                  {inventory.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <input type="number" min="0.01" step="0.01" value={receiptProductPrice} onChange={(event) => setReceiptProductPrice(event.target.value)} placeholder="Ціна, грн" className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" />
                <input type="number" min="0.01" step="0.01" value={receiptProductQuantity} onChange={(event) => setReceiptProductQuantity(event.target.value)} placeholder="Кількість" className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" />
                <button type="button" onClick={addReceiptLine} className="rounded bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600">Додати</button>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-800">
                <div className="grid grid-cols-[minmax(0,1fr)_120px_110px_110px_42px] bg-slate-900 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Найменування</span><span>Ціна, грн</span><span>Кількість</span><span>Сума, грн</span><span />
                </div>
                {receiptLines.length === 0 ? (
                  <div className="bg-[#0d131d] px-4 py-10 text-center text-sm text-slate-500">Додайте товари в це оприбуткування.</div>
                ) : receiptLines.map((line, index) => {
                  const item = inventory.find((entry) => entry.id === line.id);
                  const total = (Number(line.price) || 0) * (Number(line.quantity) || 0);
                  return <div key={`${line.id}-${index}`} className="grid grid-cols-[minmax(0,1fr)_120px_110px_110px_42px] items-center border-t border-slate-800 px-3 py-2.5 text-sm">
                    <span className="truncate pr-2 font-medium text-slate-200">{item?.name || 'Товар'}</span><span className="text-slate-300">{formatCurrency(Number(line.price) || 0)}</span><span className="text-slate-300">{line.quantity} {item?.unit}</span><span className="font-semibold text-emerald-300">{formatCurrency(total)}</span>
                    <button type="button" onClick={() => setReceiptLines((lines) => lines.filter((_, lineIndex) => lineIndex !== index))} className="text-xl leading-none text-slate-500 hover:text-rose-400" title="Видалити рядок">×</button>
                  </div>;
                })}
              </div>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Коментар
              <textarea value={receiptComment} onChange={(event) => setReceiptComment(event.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-normal text-white outline-none focus:border-emerald-500" />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 bg-[#0d131d] px-5 py-3">
            <div className="flex items-center gap-5">
              {movementMessage && <span className="text-sm text-emerald-300">{movementMessage}</span>}
              <span className="text-sm text-slate-400">Разом: <strong className="ml-1 text-lg text-white">{formatCurrency(receiptTotal)}</strong></span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input type="checkbox" checked={receiptPayFromAccount} onChange={(event) => setReceiptPayFromAccount(event.target.checked)} className="h-4 w-4 accent-emerald-500" />
                Оплатити з рахунку
              </label>
              <button type="button" onClick={(event) => handleReceiptSubmit(event, 'draft')} disabled={!receiptSupplier.trim()} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">Зберегти як чернетку</button>
              <button type="submit" disabled={!receiptSupplier.trim() || receiptLines.length === 0} className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/10 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">Створити</button>
            </div>
          </div>
        </form>
      )}

      {activeSection === 'writeoff' && !isWriteoffFormOpen && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-slate-400">Історія списань товарів зі складу.</p>
            <button type="button" onClick={() => setIsWriteoffFormOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/10 transition-colors hover:bg-rose-400">
              <Plus className="h-4 w-4" />
              Списання
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-xl shadow-black/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#131b2c] text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Списання</th><th className="px-4 py-3">Створено</th><th className="px-4 py-3">Товар</th><th className="px-4 py-3">Кількість</th><th className="px-4 py-3">Причина</th><th className="px-4 py-3 text-right">Сума, грн</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {writeoffRecords.length === 0 ? <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-500">Списань ще немає. Створіть перший документ.</td></tr> : writeoffRecords.map((record) => <tr key={record.id} className="hover:bg-slate-900/60">
                    <td className="px-4 py-3 font-semibold text-rose-300">{record.number}</td>
                    <td className="px-4 py-3 text-slate-300">{new Date(record.createdAt).toLocaleDateString('uk-UA')}<span className="block text-xs text-slate-500">{new Date(record.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span></td>
                    <td className="px-4 py-3 font-medium text-white">{record.itemName}</td><td className="px-4 py-3 text-slate-300">{record.quantity} {record.unit}</td><td className="px-4 py-3 text-slate-400">{record.reason}</td><td className="px-4 py-3 text-right font-mono text-white">{formatCurrency(record.total)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'writeoff' && isWriteoffFormOpen && (
        <form onSubmit={handleMovement} className="rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PackageMinus className="h-5 w-5 text-rose-400" />
              Списання товару
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Зменшіть залишок через використання, брак або іншу причину.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              required
              value={movementItemId}
              onChange={(event) => setMovementItemId(event.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">Оберіть товар *</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.quantity} {item.unit})
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={movementQuantity}
              onChange={(event) => setMovementQuantity(event.target.value)}
              placeholder="Кількість *"
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={movementNote}
              onChange={(event) => setMovementNote(event.target.value)}
              placeholder="Підстава / примітка"
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {movementMessage && <p className="text-sm text-emerald-300">{movementMessage}</p>}
            <button
              type="submit"
              className="rounded-xl bg-rose-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-rose-300"
            >
              Провести списання
            </button>
          </div>
        </form>
      )}

      {activeSection === 'inventory' && (
        <form onSubmit={handleInventoryCount} className="rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-sky-400" />
              Проведення інвентаризації
            </h2>
            <p className="mt-1 text-xs text-slate-400">Звірте фактичний залишок із даними системи та зафіксуйте різницю.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select required value={countItemId} onChange={(event) => setCountItemId(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500">
              <option value="">Оберіть товар *</option>
              {inventory.map((item) => <option key={item.id} value={item.id}>{item.name} (облік: {item.quantity} {item.unit})</option>)}
            </select>
            <input required type="number" min="0" step="0.01" value={countQuantity} onChange={(event) => setCountQuantity(event.target.value)} placeholder="Фактична кількість *" className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500" />
            <input type="text" value={countNote} onChange={(event) => setCountNote(event.target.value)} placeholder="Коментар перевірки" className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {movementMessage && <p className="text-sm text-sky-300">{movementMessage}</p>}
            <button type="submit" className="rounded-xl bg-sky-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-sky-300">Зафіксувати залишок</button>
          </div>
        </form>
      )}

      {activeSection === 'stock' && <>
      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">Позицій на складі</span>
            <div className="text-xl font-bold text-white mt-0.5">{inventory.length} найменувань</div>
          </div>
          <Package className="w-8 h-8 text-slate-700" />
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">Загальна вартість складу</span>
            <div className="text-xl font-black text-amber-400 mt-0.5">{formatCurrency(totalValue)}</div>
          </div>
          <Layers className="w-8 h-8 text-amber-500/20" />
        </div>

        <div
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            showLowStockOnly
              ? 'bg-rose-500/15 border-rose-500/50'
              : 'bg-[#111827] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">Критичні залишки</span>
            <div className="text-xl font-bold text-rose-400 mt-0.5 flex items-center gap-2">
              {lowStockCount} позицій
              {showLowStockOnly && <span className="text-[10px] bg-rose-500/30 px-1.5 py-0.5 rounded text-rose-200">Фільтр активний</span>}
            </div>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-500/40" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          aria-label="Склад"
          className="rounded-xl border border-slate-800 bg-[#111827] px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none sm:w-56"
        >
          <option>Склад: Основний склад</option>
          <option>Склад: Малярні матеріали</option>
        </select>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук матеріалу, постачальника або опису..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111827] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-[#111827] border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
        >
          <option value="all">Усі категорії матеріалів</option>
          {Object.entries(INVENTORY_CATEGORIES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value as 'all' | 'available' | 'empty')}
          aria-label="Доступність"
          className="rounded-xl border border-slate-800 bg-[#111827] px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
        >
          <option value="all">Доступність: Усі</option>
          <option value="available">Доступність: Є в наявності</option>
          <option value="empty">Доступність: Немає</option>
        </select>
      </div>

      {/* Inventory Table / Responsive Cards */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-[#111827] space-y-3">
          <Boxes className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Матеріалів не знайдено</p>
          <p className="text-xs text-slate-500">Спробуйте змінити фільтри або додайте нову позицію</p>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#111827]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#131b2e] text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="p-3.5">Артикул</th>
                  <th className="p-3.5">Зображення</th>
                  <th className="p-3.5">Найменування</th>
                  <th className="p-3.5 text-center">Залишок</th>
                  <th className="p-3.5 text-center">Мін. залишок</th>
                  <th className="p-3.5 text-right">Закупівля</th>
                  <th className="p-3.5 text-right">Роздріб</th>
                  <th className="p-3.5 text-right">Сервіс</th>
                  <th className="p-3.5 text-center">Гарантія</th>
                  <th className="p-3.5 text-center">Придатний до</th>
                  <th className="p-3.5 text-right">Сума</th>
                  <th className="p-3.5 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredItems.map((item) => {
                  const isLow = item.quantity <= item.minQuantity;
                  const itemTotal = item.quantity * item.price;

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                      {/* Name and Category */}
                      <td className="p-3.5 text-slate-300">{item.sku || '—'}</td>

                      <td className="p-3.5">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg border border-slate-700 object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-600"><Package className="h-4 w-4" /></div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm">{item.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                            {INVENTORY_CATEGORIES[item.category] || item.category}
                          </span>
                          {item.supplier && (
                            <span className="text-[11px] text-slate-400">
                              Постачальник: {item.supplier}
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-400 italic mt-0.5">{item.notes}</div>
                        )}
                      </td>

                      {/* Quantity & Low alert */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={`font-mono text-sm font-bold ${
                              isLow ? 'text-rose-400 font-extrabold' : 'text-slate-100'
                            }`}
                          >
                            {item.quantity} {item.unit}
                          </span>
                          {isLow && (
                            <span
                              title={`Критичний залишок! Поріг: ${item.minQuantity} ${item.unit}`}
                              className="text-rose-400"
                            >
                              <AlertTriangle className="w-4 h-4 inline" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          мін. поріг: {item.minQuantity} {item.unit}
                        </div>
                      </td>

                      <td className="p-3.5 text-center font-mono text-slate-300">
                        {item.minQuantity} {item.unit}
                      </td>

                      <td className="p-3.5 text-right font-mono text-slate-200">
                        {formatCurrency(item.price)}
                      </td>

                      <td className="p-3.5 text-right font-mono text-blue-300">
                        {formatCurrency(item.retailPrice ?? item.price)}
                      </td>

                      <td className="p-3.5 text-right font-mono text-sky-300">
                        {formatCurrency(item.servicePrice ?? item.retailPrice ?? item.price)}
                      </td>

                      <td className="p-3.5 text-center text-slate-300">
                        {item.warrantyMonths ? `${item.warrantyMonths} міс.` : '—'}
                      </td>

                      <td className="p-3.5 text-center text-slate-300">
                        {item.expirationDate || '—'}
                      </td>

                      {/* Total Value */}
                      <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                        {formatCurrency(itemTotal)}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Редагувати"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Видалити "${item.name}" зі складу?`)) {
                                onDeleteItem(item.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Видалити"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>}

      {/* Modal: Create or Edit Item */}
      <Modal
        isOpen={isCreateOpen || Boolean(editingItem)}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Редагувати матеріал' : 'Додати матеріал на склад'}
        subtitle="Вкажіть назву, категорію, кількість та вартість закупівлі"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Артикул / код товару
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="напр. CLR-610-1L"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Назва матеріалу *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="напр. Лак акриловий Roberlo Kronox 610"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Посилання на зображення
            </label>
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Категорія *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {Object.entries(INVENTORY_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Одиниця виміру *
              </label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="л, кг, шт, балон, рулон"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Кількість *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Мін. поріг *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Закупівля (₴) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Роздріб (₴)
              </label>
              <input
                type="number"
                min="0"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Сервісна ціна (₴)
              </label>
              <input type="number" min="0" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Гарантія (міс.)
              </label>
              <input type="number" min="0" value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Термін придатності
              </label>
              <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Постачальник
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="напр. АвтоФарби Київ, Колорист-Лаб"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Нотатки / Інструкція зі змішування
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Пропорції змішування, час сушки, особливості нанесення..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingItem(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
            >
              {editingItem ? 'Зберегти зміни' : 'Додати на склад'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
