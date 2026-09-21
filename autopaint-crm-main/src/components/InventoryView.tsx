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
  Layers,
  Sparkles,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import { InventoryItem, InventoryCategory } from '../types';
import { Modal } from './Modal';
import { formatCurrency, INVENTORY_CATEGORIES } from '../lib/formatters';

interface InventoryViewProps {
  inventory: InventoryItem[];
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
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('clearcoats');
  const [unit, setUnit] = useState('шт');
  const [quantity, setQuantity] = useState<string>('1');
  const [minQuantity, setMinQuantity] = useState<string>('1');
  const [price, setPrice] = useState<string>('0');
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
    setCategory('clearcoats');
    setUnit('л');
    setQuantity('1');
    setMinQuantity('2');
    setPrice('500');
    setSupplier('');
    setNotes('');
    setIsCreateOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setQuantity(String(item.quantity));
    setMinQuantity(String(item.minQuantity));
    setPrice(String(item.price));
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : 'inv-' + Date.now(),
      name: name.trim(),
      category,
      unit: unit.trim(),
      quantity: Number(quantity) || 0,
      minQuantity: Number(minQuantity) || 1,
      price: Number(price) || 0,
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
                  <th className="p-3.5">Матеріал / Категорія</th>
                  <th className="p-3.5 text-center">Залишок</th>
                  <th className="p-3.5 text-right">Ціна за од.</th>
                  <th className="p-3.5 text-right">Сума</th>
                  <th className="p-3.5 text-center">Швидка зміна</th>
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

                      {/* Unit Price */}
                      <td className="p-3.5 text-right font-mono text-slate-200">
                        {formatCurrency(item.price)}
                      </td>

                      {/* Total Value */}
                      <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                        {formatCurrency(itemTotal)}
                      </td>

                      {/* Quick Adjust Buttons */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                          <button
                            onClick={() => handleQuickAdjust(item, -1)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Списати 1 од."
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickAdjust(item, 1)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Додати 1 од."
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

          <div className="grid grid-cols-3 gap-3">
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
                Ціна (₴) *
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
