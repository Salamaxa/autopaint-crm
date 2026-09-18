import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Car,
  ClipboardList,
  Edit2,
  Trash2,
  ExternalLink,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Client, Vehicle, Order } from '../types';
import { Modal } from './Modal';
import { formatCurrency, formatDate } from '../lib/formatters';
import { StatusBadge, PaymentBadge } from './StatusBadge';

interface ClientsViewProps {
  clients: Client[];
  vehicles: Vehicle[];
  orders: Order[];
  onSaveClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onSelectOrder: (order: Order) => void;
  onNewOrderForClient?: (clientId: string) => void;
  onNewVehicleForClient?: (clientId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  vehicles,
  orders,
  onSaveClient,
  onDeleteClient,
  onSelectOrder,
  onNewOrderForClient,
  onNewVehicleForClient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    });
  }, [clients, searchQuery]);

  const openCreateModal = () => {
    setName('');
    setPhone('+380 ');
    setNotes('');
    setIsCreateOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setNotes(client.notes || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newClient: Client = {
      id: editingClient ? editingClient.id : 'client-' + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim() || undefined,
      createdAt: editingClient ? editingClient.createdAt : new Date().toISOString(),
    };

    onSaveClient(newClient);
    setIsCreateOpen(false);
    setEditingClient(null);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            База клієнтів
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Контакти автовласників, історія замовлень та персональні нотатки
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          Додати клієнта
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Пошук за ім'ям, номером телефону або нотатками..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111827] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition-all"
        />
      </div>

      {/* Clients Grid / List */}
      {filteredClients.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-[#111827] space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Клієнтів не знайдено</p>
          <p className="text-xs text-slate-500">Спробуйте змінити запит або додайте першого клієнта</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const clientVehicles = vehicles.filter((v) => v.clientId === client.id);
            const clientOrders = orders.filter((o) => o.clientId === client.id);
            const totalSpent = clientOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
            const currentDebt = clientOrders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);

            return (
              <div
                key={client.id}
                className="rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-all p-4 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Client Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-1">{client.name}</h3>
                      <a
                        href={`tel:${client.phone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 mt-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {client.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingClient(client)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Детальніше"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(client)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Редагувати"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Видалити клієнта "${client.name}"?`)) {
                            onDeleteClient(client.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Видалити"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  {client.notes && (
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{client.notes}</p>
                    </div>
                  )}

                  {/* Connected Cars Chips */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Автомобілі ({clientVehicles.length}):
                    </span>
                    {clientVehicles.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">Авто ще не додано</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {clientVehicles.map((v) => (
                          <span
                            key={v.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-xs border border-slate-700"
                          >
                            <Car className="w-3 h-3 text-amber-400" />
                            {v.make} {v.model} ({v.licensePlate})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Stats & Quick Action */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-slate-400">
                      Оплачено: <span className="font-semibold text-slate-200">{formatCurrency(totalSpent)}</span>
                    </div>
                    {currentDebt > 0 && (
                      <div className="text-rose-400 font-bold">
                        Борг: {formatCurrency(currentDebt)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setViewingClient(client)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Картка клієнта
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Client */}
      <Modal
        isOpen={isCreateOpen || Boolean(editingClient)}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingClient(null);
        }}
        title={editingClient ? 'Редагувати клієнта' : 'Новий клієнт'}
        subtitle="Вкажіть контактні дані та корисні примітки"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Ім'я / ПІБ *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="наприклад: Олександр Мельник"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Номер телефону *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+380 67 000 0000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Нотатки (побажання, особливості, знижки)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="наприклад: Постійний клієнт, привозить машини зі Штатів, просить фарбувати під товщиномір..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingClient(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20"
            >
              {editingClient ? 'Зберегти зміни' : 'Створити клієнта'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Client Details */}
      {viewingClient && (
        <Modal
          isOpen={Boolean(viewingClient)}
          onClose={() => setViewingClient(null)}
          title={`Клієнт: ${viewingClient.name}`}
          subtitle={`Зареєстровано: ${formatDate(viewingClient.createdAt)}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Quick Contact & Notes */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <a
                  href={`tel:${viewingClient.phone}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold hover:bg-amber-500/20"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {viewingClient.phone}
                </a>

                <button
                  onClick={() => {
                    setViewingClient(null);
                    openEditModal(viewingClient);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Редагувати дані
                </button>
              </div>

              {viewingClient.notes && (
                <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                  <strong>Нотатки:</strong> {viewingClient.notes}
                </div>
              )}
            </div>

            {/* Client Vehicles */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-amber-400" />
                  Автомобілі клієнта
                </h4>
                {onNewVehicleForClient && (
                  <button
                    onClick={() => {
                      const id = viewingClient.id;
                      setViewingClient(null);
                      onNewVehicleForClient(id);
                    }}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    + Додати авто
                  </button>
                )}
              </div>

              {vehicles.filter((v) => v.clientId === viewingClient.id).length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-lg">Авто ще не закріплені.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {vehicles
                    .filter((v) => v.clientId === viewingClient.id)
                    .map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="font-bold text-white flex items-center justify-between">
                          <span>{v.make} {v.model}</span>
                          <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 text-[11px] border border-slate-700">
                            {v.licensePlate}
                          </span>
                        </div>
                        {v.colorCode && (
                          <div className="text-slate-400 text-[11px]">
                            Код фарби: <span className="text-slate-200 font-mono">{v.colorCode}</span>
                          </div>
                        )}
                        <div className="text-slate-500 font-mono text-[10px]">VIN: {v.vin}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Client Orders History */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-amber-400" />
                  Історія замовлень ({orders.filter((o) => o.clientId === viewingClient.id).length})
                </h4>
                {onNewOrderForClient && (
                  <button
                    onClick={() => {
                      const id = viewingClient.id;
                      setViewingClient(null);
                      onNewOrderForClient(id);
                    }}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    + Створити замовлення
                  </button>
                )}
              </div>

              {orders.filter((o) => o.clientId === viewingClient.id).length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-lg">Замовлень поки немає.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {orders
                    .filter((o) => o.clientId === viewingClient.id)
                    .map((o) => (
                      <div
                        key={o.id}
                        onClick={() => {
                          setViewingClient(null);
                          onSelectOrder(o);
                        }}
                        className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400">{o.orderNumber}</span>
                            <StatusBadge status={o.status} size="sm" />
                          </div>
                          <div className="text-slate-400 text-[11px]">{formatDate(o.date)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">{formatCurrency(o.totalAmount)}</div>
                          {o.remainingAmount > 0 ? (
                            <span className="text-rose-400 text-[11px]">Борг: {formatCurrency(o.remainingAmount)}</span>
                          ) : (
                            <span className="text-emerald-400 text-[11px]">Сплачено</span>
                          )}
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
