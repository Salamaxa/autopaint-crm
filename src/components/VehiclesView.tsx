import React, { useState, useMemo } from 'react';
import {
  Car,
  Search,
  Plus,
  Edit2,
  Trash2,
  Users,
  Eye,
  FileText,
  ClipboardList,
  Palette,
  Hash,
} from 'lucide-react';
import { Vehicle, Client, Order } from '../types';
import { Modal } from './Modal';
import { formatDate, formatCurrency } from '../lib/formatters';
import { StatusBadge } from './StatusBadge';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  clients: Client[];
  orders: Order[];
  onSaveVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onSelectOrder: (order: Order) => void;
  onNewOrderForVehicle?: (vehicleId: string) => void;
  preselectedClientId?: string | null;
  onClearPreselectedClient?: () => void;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({
  vehicles,
  clients,
  orders,
  onSaveVehicle,
  onDeleteVehicle,
  onSelectOrder,
  onNewOrderForVehicle,
  preselectedClientId,
  onClearPreselectedClient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(Boolean(preselectedClientId));

  // Form states
  const [clientId, setClientId] = useState(preselectedClientId || (clients[0]?.id || ''));
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');
  const [year, setYear] = useState<string>('');
  const [colorName, setColorName] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [notes, setNotes] = useState('');

  // Search filter
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const client = clients.find((c) => c.id === v.clientId);
      if (!q) return true;
      return (
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.licensePlate.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q) ||
        (v.colorCode && v.colorCode.toLowerCase().includes(q)) ||
        (client && client.name.toLowerCase().includes(q))
      );
    });
  }, [vehicles, clients, searchQuery]);

  const openCreateModal = () => {
    setClientId(clients[0]?.id || '');
    setMake('');
    setModel('');
    setLicensePlate('');
    setVin('');
    setYear('');
    setColorName('');
    setColorCode('');
    setNotes('');
    setIsCreateOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setClientId(vehicle.clientId);
    setMake(vehicle.make);
    setModel(vehicle.model);
    setLicensePlate(vehicle.licensePlate);
    setVin(vehicle.vin);
    setYear(vehicle.year ? String(vehicle.year) : '');
    setColorName(vehicle.colorName || '');
    setColorCode(vehicle.colorCode || '');
    setNotes(vehicle.notes || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!make.trim() || !licensePlate.trim() || !vin.trim()) return;

    const newVehicle: Vehicle = {
      id: editingVehicle ? editingVehicle.id : 'veh-' + Date.now(),
      clientId,
      make: make.trim(),
      model: model.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      vin: vin.trim().toUpperCase(),
      year: year ? parseInt(year, 10) : undefined,
      colorName: colorName.trim() || undefined,
      colorCode: colorCode.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: editingVehicle ? editingVehicle.createdAt : new Date().toISOString(),
    };

    onSaveVehicle(newVehicle);
    setIsCreateOpen(false);
    setEditingVehicle(null);
    if (onClearPreselectedClient) onClearPreselectedClient();
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-amber-400" />
            Автопарк клієнтів
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Марки, держномери, VIN-коди, кольори та коди фарби для точного підбору
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          Додати автомобіль
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Пошук за номерним знаком, маркою, моделлю, VIN або власником..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111827] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition-all"
        />
      </div>

      {/* Vehicles Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-[#111827] space-y-3">
          <Car className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Автомобілів не знайдено</p>
          <p className="text-xs text-slate-500">Перевірте параметри пошуку або додайте перше авто</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => {
            const client = clients.find((c) => c.id === vehicle.clientId);
            const vehicleOrders = orders.filter((o) => o.vehicleId === vehicle.id);

            return (
              <div
                key={vehicle.id}
                className="rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-all p-4 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Bar: License Plate & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    {/* Ukrainian-style license plate badge */}
                    <div className="inline-flex items-center border border-slate-700 bg-slate-900 rounded-md overflow-hidden shadow-sm">
                      <div className="bg-blue-600 px-1.5 py-1 flex flex-col items-center justify-center text-[9px] text-white font-bold leading-none">
                        <span>UA</span>
                        <div className="w-2.5 h-1.5 mt-0.5 rounded-[1px] bg-amber-400" />
                      </div>
                      <div className="px-2.5 py-1 font-mono font-black text-sm tracking-wider text-slate-100">
                        {vehicle.licensePlate}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingVehicle(vehicle)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Детальніше"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(vehicle)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Редагувати"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Видалити автомобіль "${vehicle.make} ${vehicle.model}" (${vehicle.licensePlate})?`)) {
                            onDeleteVehicle(vehicle.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Видалити"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Make, Model & Year */}
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      {vehicle.make} {vehicle.model} {vehicle.year && <span className="text-slate-400 font-normal">({vehicle.year})</span>}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Власник: <span className="text-slate-200 font-medium">{client ? client.name : 'Не призначено'}</span>
                    </p>
                  </div>

                  {/* Automotive Paint Code Box */}
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Palette className="w-3 h-3 text-amber-400" />
                        Код фарби:
                      </span>
                      <span className="font-mono font-bold text-amber-400 text-xs">
                        {vehicle.colorCode || 'Не визначено'}
                      </span>
                    </div>

                    {vehicle.colorName && (
                      <div className="text-slate-300 text-[11px] truncate">
                        Колір: {vehicle.colorName}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
                      <span>VIN:</span>
                      <span className="text-slate-300">{vehicle.vin}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {vehicle.notes && (
                    <p className="text-xs text-slate-400 line-clamp-2 italic bg-slate-900/40 p-2 rounded">
                      {vehicle.notes}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Замовлень: <strong className="text-slate-200">{vehicleOrders.length}</strong>
                  </span>
                  <button
                    onClick={() => setViewingVehicle(vehicle)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Історія робіт
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Vehicle */}
      <Modal
        isOpen={isCreateOpen || Boolean(editingVehicle)}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingVehicle(null);
          if (onClearPreselectedClient) onClearPreselectedClient();
        }}
        title={editingVehicle ? 'Редагувати автомобіль' : 'Новий автомобіль'}
        subtitle="Заповніть технічні дані, VIN та код заводської фарби"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Client select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Власник / Клієнт *
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Make & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Марка *
              </label>
              <input
                type="text"
                required
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="напр. Volkswagen, BMW"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Модель *
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="напр. Passat B8, 530d"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* License Plate & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Держномер *
              </label>
              <input
                type="text"
                required
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="напр. КА 5421 ВІ"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Рік випуску
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="напр. 2019"
                min="1970"
                max="2030"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* VIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              VIN-код *
            </label>
            <input
              type="text"
              required
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="17 символів (напр. WVWZZZ3CZHE129482)"
              maxLength={17}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono uppercase"
            />
          </div>

          {/* Paint Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Код фарби (Paint Code)
              </label>
              <input
                type="text"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                placeholder="напр. LC9X, 1F7, 475"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Назва кольору
              </label>
              <input
                type="text"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="напр. Чорний перламутр"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Нотатки / Особливості кузова
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Попередні перефарбування, товщина ЛФП, пошкодження..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingVehicle(null);
                if (onClearPreselectedClient) onClearPreselectedClient();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20"
            >
              {editingVehicle ? 'Зберегти зміни' : 'Додати автомобіль'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Vehicle Details */}
      {viewingVehicle && (
        <Modal
          isOpen={Boolean(viewingVehicle)}
          onClose={() => setViewingVehicle(null)}
          title={`${viewingVehicle.make} ${viewingVehicle.model} (${viewingVehicle.licensePlate})`}
          subtitle={`VIN: ${viewingVehicle.vin}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Власник:</span>
                <span className="font-bold text-white text-sm">
                  {clients.find((c) => c.id === viewingVehicle.clientId)?.name || 'Невідомо'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Рік випуску:</span>
                <span className="font-bold text-white text-sm">{viewingVehicle.year || 'Не вказано'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Код фарби:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {viewingVehicle.colorCode || 'Не вказано'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Колір авто:</span>
                <span className="font-bold text-white text-sm">{viewingVehicle.colorName || 'Не вказано'}</span>
              </div>
            </div>

            {viewingVehicle.notes && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                <strong>Нотатки по кузову:</strong> {viewingVehicle.notes}
              </div>
            )}

            {/* Orders for this vehicle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-amber-400" />
                  Історія фарбувань та замовлень
                </h4>
                {onNewOrderForVehicle && (
                  <button
                    onClick={() => {
                      const id = viewingVehicle.id;
                      setViewingVehicle(null);
                      onNewOrderForVehicle(id);
                    }}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    + Нове замовлення
                  </button>
                )}
              </div>

              {orders.filter((o) => o.vehicleId === viewingVehicle.id).length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-lg">
                  Для цього авто ще немає зареєстрованих робіт.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {orders
                    .filter((o) => o.vehicleId === viewingVehicle.id)
                    .map((o) => (
                      <div
                        key={o.id}
                        onClick={() => {
                          setViewingVehicle(null);
                          onSelectOrder(o);
                        }}
                        className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400">{o.orderNumber}</span>
                            <StatusBadge status={o.status} size="sm" />
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">{formatDate(o.date)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">{formatCurrency(o.totalAmount)}</div>
                          <div className="text-[11px] text-slate-400">{o.works.length} робіт, {o.materials.length} матеріалів</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
