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

interface InventoryViewProps {
  onSaveItem: (item: InventoryItem) => void;

  onDeleteItem: (id: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onSaveItem,
  onDeleteItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [activeSection, setActiveSection] = useState<'stock' | 'receipt' | 'writeoff' | 'inventory'>('stock');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [movementItemId, setMovementItemId] = useState('');
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementPrice, setMovementPrice] = useState('');
  const [movementNote, setMovementNote] = useState('');
  const [movementMessage, setMovementMessage] = useState<string | null>(null);
  const [countItemId, setCountItemId] = useState('');
  const [countQuantity, setCountQuantity] = useState('');
  const [countNote, setCountNote] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('clearcoats');
  const [unit, setUnit] = useState('шт');
  const [quantity, setQuantity] = useState<string>('1');
  const [minQuantity, setMinQuantity] = useState<string>('1');
  const [price, setPrice] = useState<string>('0');
  const [retailPrice, setRetailPrice] = useState<string>('0');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  // Stats
  const totalValue = useMemo(() => {
    return inventory.reduce((acc, curr) => acc + curr.quantity * curr.price, 0);
  }, [inventory]);

  const lowStockCount = useMemo(() => {
    return inventory.filter((i) => i.quantity <= i.minQuantity).length;
  }, [inventory]);

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

      return matchesSearch && matchesCat && matchesLow;
    });
  }, [inventory, searchQuery, categoryFilter, showLowStockOnly]);

  const openCreateModal = () => {
    setName('');
    setSku('');
    setCategory('clearcoats');
    setUnit('л');
    setQuantity('1');
    setMinQuantity('2');
    setPrice('500');
    setRetailPrice('0');
    setSupplier('');
    setNotes('');
    setIsCreateOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku || '');
    setCategory(item.category);
    setUnit(item.unit);
    setQuantity(String(item.quantity));
    setMinQuantity(String(item.minQuantity));
    setPrice(String(item.price));
    setRetailPrice(String(item.retailPrice ?? item.price));
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

    setMovementMessage(
      `${activeSection === 'receipt' ? 'Оприбутковано' : 'Списано'} ${amount} ${item.unit}: ${item.name}`
    );
    setMovementQuantity('');
    setMovementPrice('');
    setMovementNote('');
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
      category,
      unit: unit.trim(),
      quantity: Number(quantity) || 0,
      minQuantity: Number(minQuantity) || 1,
      price: Number(price) || 0,
      retailPrice: Number(retailPrice) || 0,
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

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
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
            }}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              activeSection === id
                ? id === 'writeoff'
                  ? 'border-rose-500/60 bg-rose-500/10 text-rose-300'
                  : id === 'receipt'
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {(activeSection === 'receipt' || activeSection === 'writeoff') && (
        <form onSubmit={handleMovement} className="rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {activeSection === 'receipt' ? <PackagePlus className="h-5 w-5 text-emerald-400" /> : <PackageMinus className="h-5 w-5 text-rose-400" />}
              {activeSection === 'receipt' ? 'Оприбуткування товару' : 'Списання товару'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {activeSection === 'receipt'
                ? 'Додайте отриману кількість до залишку складу.'
                : 'Зменшіть залишок через використання, брак або іншу причину.'}
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
            {activeSection === 'receipt' && (
              <input
                type="number"
                min="0"
                step="0.01"
                value={movementPrice}
                onChange={(event) => setMovementPrice(event.target.value)}
                placeholder="Нова ціна закупівлі"
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            )}
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
              className={`rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors ${activeSection === 'receipt' ? 'bg-emerald-400 hover:bg-emerald-300' : 'bg-rose-400 hover:bg-rose-300'}`}
            >
              {activeSection === 'receipt' ? 'Провести оприбуткування' : 'Провести списання'}
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
      <div className="flex flex-col sm:flex-row gap-3">
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
                  <th className="p-3.5">Артикул / Найменування</th>
                  <th className="p-3.5 text-center">Залишок</th>
                  <th className="p-3.5 text-center">Мін. залишок</th>
                  <th className="p-3.5 text-right">Закупівля</th>
                  <th className="p-3.5 text-right">Роздріб</th>
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
                      <td className="p-3.5">
                        <div className="text-[11px] text-slate-400 mb-1">{item.sku || 'Без артикулу'}</div>
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
