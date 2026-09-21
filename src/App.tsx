import React, { useState, useEffect } from 'react';
import { ActiveTab, Client, Vehicle, Order, InventoryItem, FinanceTransaction, OrderStatus, PaymentMethod } from './types';
import { storage } from './lib/storage';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { VehiclesView } from './components/VehiclesView';
import { OrdersView } from './components/OrdersView';
import { InventoryView } from './components/InventoryView';
import { FinancesView } from './components/FinancesView';
import { CloudDatabaseModal } from './components/CloudDatabaseModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Application Data States
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);

  // Modals & Navigation Helpers
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Quick Create triggers
  const [orderCreateTrigger, setOrderCreateTrigger] = useState(false);
  const [clientCreateTrigger, setClientCreateTrigger] = useState(false);
  const [vehicleCreateTrigger, setVehicleCreateTrigger] = useState(false);
  const [inventoryCreateTrigger, setInventoryCreateTrigger] = useState(false);
  const [financeCreateTrigger, setFinanceCreateTrigger] = useState(false);

  // Preselections when linking between entities
  const [preselectedClientId, setPreselectedClientId] = useState<string | null>(null);
  const [preselectedVehicleId, setPreselectedVehicleId] = useState<string | null>(null);

  // Reload data from storage
  const loadData = () => {
    setClients(storage.getClients());
    setVehicles(storage.getVehicles());
    setOrders(storage.getOrders());
    setInventory(storage.getInventory());
    setTransactions(storage.getTransactions());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storage.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  // Quick stats for badges
  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  ).length;

  const lowStockCount = inventory.filter((i) => i.quantity <= i.minQuantity).length;

  // Handlers for cross-tab creation
  const handleOpenNewOrder = (clientId?: string, vehicleId?: string) => {
    if (clientId) setPreselectedClientId(clientId);
    if (vehicleId) setPreselectedVehicleId(vehicleId);
    setActiveTab('orders');
    setOrderCreateTrigger(true);
  };

  const handleOpenNewVehicle = (clientId?: string) => {
    if (clientId) setPreselectedClientId(clientId);
    setActiveTab('vehicles');
    setVehicleCreateTrigger(true);
  };

  const handleOpenNewClient = () => {
    setActiveTab('clients');
    setClientCreateTrigger(true);
  };

  const handleOpenNewInventory = () => {
    setActiveTab('inventory');
    setInventoryCreateTrigger(true);
  };

  const handleOpenNewTransaction = () => {
    setActiveTab('finances');
    setFinanceCreateTrigger(true);
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setActiveTab('orders');
  };

  return (
    <div className="min-h-screen bg-[#090d14] text-slate-100 flex flex-col md:flex-row antialiased font-sans">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedOrder(null);
        }}
        activeOrdersCount={activeOrdersCount}
        lowStockCount={lowStockCount}
        openSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Desktop Header */}
        <Header
          activeTab={activeTab}
          onOpenNewOrder={() => handleOpenNewOrder()}
          onOpenNewClient={handleOpenNewClient}
          onOpenNewVehicle={() => handleOpenNewVehicle()}
          onOpenNewInventory={handleOpenNewInventory}
          onOpenNewTransaction={handleOpenNewTransaction}
          openSupabaseModal={() => setIsSupabaseModalOpen(true)}
          activeOrdersCount={activeOrdersCount}
          lowStockCount={lowStockCount}
        />

        {/* Mobile Nav & Top Header */}
        <MobileNav
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSelectedOrder(null);
          }}
          activeOrdersCount={activeOrdersCount}
          lowStockCount={lowStockCount}
          openSupabaseModal={() => setIsSupabaseModalOpen(true)}
        />

        {/* View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              orders={orders}
              clients={clients}
              vehicles={vehicles}
              inventory={inventory}
              transactions={transactions}
              setActiveTab={setActiveTab}
              onOpenNewOrder={() => handleOpenNewOrder()}
              onOpenNewClient={handleOpenNewClient}
              onOpenNewTransaction={handleOpenNewTransaction}
              onSelectOrder={handleSelectOrder}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsView
              clients={clients}
              vehicles={vehicles}
              orders={orders}
              onSaveClient={(c) => storage.saveClient(c)}
              onDeleteClient={(id) => storage.deleteClient(id)}
              onSelectOrder={handleSelectOrder}
              onNewOrderForClient={(clientId) => handleOpenNewOrder(clientId)}
              onNewVehicleForClient={(clientId) => handleOpenNewVehicle(clientId)}
            />
          )}

          {activeTab === 'vehicles' && (
            <VehiclesView
              vehicles={vehicles}
              clients={clients}
              orders={orders}
              onSaveVehicle={(v) => storage.saveVehicle(v)}
              onDeleteVehicle={(id) => storage.deleteVehicle(id)}
              onSelectOrder={handleSelectOrder}
              onNewOrderForVehicle={(vehicleId) => {
                const veh = vehicles.find((v) => v.id === vehicleId);
                handleOpenNewOrder(veh?.clientId, vehicleId);
              }}
              preselectedClientId={preselectedClientId}
              onClearPreselectedClient={() => setPreselectedClientId(null)}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersView
              orders={orders}
              clients={clients}
              vehicles={vehicles}
              inventory={inventory}
              onSaveOrder={(o) => storage.saveOrder(o)}
              onDeleteOrder={(id) => storage.deleteOrder(id)}
              onUpdateStatus={(id, status) => storage.updateOrderStatus(id, status)}
              onAddPayment={(id, amount, method, notes) =>
                storage.addOrderPayment(id, amount, method, notes)
              }
              selectedOrder={selectedOrder}
              onClearSelectedOrder={() => setSelectedOrder(null)}
              initialCreateOpen={orderCreateTrigger}
              onCloseInitialCreate={() => {
                setOrderCreateTrigger(false);
                setPreselectedClientId(null);
                setPreselectedVehicleId(null);
              }}
              preselectedClientId={preselectedClientId}
              preselectedVehicleId={preselectedVehicleId}
              onSaveClient={(c) => storage.saveClient(c)}
              onSaveVehicle={(v) => storage.saveVehicle(v)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              inventory={inventory}
              onSaveItem={(i) => storage.saveInventoryItem(i)}
              onDeleteItem={(id) => storage.deleteInventoryItem(id)}
            />
          )}

          {activeTab === 'finances' && (
            <FinancesView
              transactions={transactions}
              orders={orders}
              clients={clients}
              onSaveTransaction={(t) => storage.saveTransaction(t)}
              onDeleteTransaction={(id) => storage.deleteTransaction(id)}
              onAddPaymentToOrder={(id, amount, method, notes) =>
                storage.addOrderPayment(id, amount, method, notes)
              }
              onSelectOrder={handleSelectOrder}
              initialCreateOpen={financeCreateTrigger}
              onCloseInitialCreate={() => setFinanceCreateTrigger(false)}
            />
          )}
        </main>
      </div>

      {/* Cloud Firestore database modal */}
      <CloudDatabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onRefreshData={loadData}
        counts={{
          clients: clients.length,
          vehicles: vehicles.length,
          orders: orders.length,
          inventory: inventory.length,
          finances: transactions.length,
        }}
      />
    </div>
  );
}
