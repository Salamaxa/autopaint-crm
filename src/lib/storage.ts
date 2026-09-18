import { Client, Vehicle, Order, InventoryItem, FinanceTransaction, OrderStatus } from '../types';
import { initialClients, initialVehicles, initialOrders, initialInventory, initialTransactions } from './sampleData';
import { calculateWorkItemSalary } from './salary';
import { idb } from './db';
import { firestoreSync } from './firestoreService';

const STORAGE_KEYS = {
  CLIENTS: 'autopaint_crm_clients',
  VEHICLES: 'autopaint_crm_vehicles',
  ORDERS: 'autopaint_crm_orders',
  INVENTORY: 'autopaint_crm_inventory',
  TRANSACTIONS: 'autopaint_crm_transactions',
  IS_PRODUCTION_MODE: 'autopaint_crm_prod_mode',
};

type Listener = () => void;

class StorageService {
  private listeners: Set<Listener> = new Set();
  private isInitialized = false;

  constructor() {
    this.initStorage();
    this.initFirestoreSync();
  }

  private initStorage() {
    if (typeof window === 'undefined') return;
    try {
      if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(initialClients));
        idb.bulkPut('clients', initialClients);
      }
      if (!localStorage.getItem(STORAGE_KEYS.VEHICLES)) {
        localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(initialVehicles));
        idb.bulkPut('vehicles', initialVehicles);
      }
      if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
        const sanitized = initialOrders.map((o) => this.sanitizeOrder(o));
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(sanitized));
        idb.bulkPut('orders', sanitized);
      }
      if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(initialInventory));
        idb.bulkPut('inventory', initialInventory);
      }
      if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initialTransactions));
        idb.bulkPut('transactions', initialTransactions);
      }

      this.isInitialized = true;
    } catch (e) {
      console.error('Failed to initialize storage:', e);
    }
  }

  private initFirestoreSync() {
    if (typeof window === 'undefined') return;

    // Real-time synchronization from Firestore to local state
    firestoreSync.subscribeToCollection<Client>('clients', (remoteClients) => {
      if (remoteClients.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(remoteClients));
        idb.bulkPut('clients', remoteClients);
        this.notify();
      } else {
        // First boot seeding if Firestore is empty
        const current = this.getClients();
        if (current.length > 0) {
          current.forEach((c) => firestoreSync.saveEntity('clients', c));
        }
      }
    });

    firestoreSync.subscribeToCollection<Vehicle>('vehicles', (remoteVehicles) => {
      if (remoteVehicles.length > 0) {
        localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(remoteVehicles));
        idb.bulkPut('vehicles', remoteVehicles);
        this.notify();
      } else {
        const current = this.getVehicles();
        if (current.length > 0) {
          current.forEach((v) => firestoreSync.saveEntity('vehicles', v));
        }
      }
    });

    firestoreSync.subscribeToCollection<Order>('orders', (remoteOrders) => {
      if (remoteOrders.length > 0) {
        const sanitized = remoteOrders.map((o) => this.sanitizeOrder(o));
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(sanitized));
        idb.bulkPut('orders', sanitized);
        this.notify();
      } else {
        const current = this.getOrders();
        if (current.length > 0) {
          current.forEach((o) => firestoreSync.saveEntity('orders', this.sanitizeOrder(o)));
        }
      }
    });

    firestoreSync.subscribeToCollection<InventoryItem>('inventory', (remoteItems) => {
      if (remoteItems.length > 0) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(remoteItems));
        idb.bulkPut('inventory', remoteItems);
        this.notify();
      } else {
        const current = this.getInventory();
        if (current.length > 0) {
          current.forEach((i) => firestoreSync.saveEntity('inventory', i));
        }
      }
    });

    firestoreSync.subscribeToCollection<FinanceTransaction>('finances', (remoteTx) => {
      if (remoteTx.length > 0) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(remoteTx));
        idb.bulkPut('transactions', remoteTx);
        this.notify();
      } else {
        const current = this.getTransactions();
        if (current.length > 0) {
          current.forEach((t) => firestoreSync.saveEntity('finances', t));
        }
      }
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Listener notification error:', e);
      }
    });
  }

  // --- Sanitization & Payroll Calculation Helper ---
  public sanitizeOrder(order: Order): Order {
    const works = (order.works || []).map((w) => {
      const price = Math.max(0, Number(w.price) || 0);
      const materialCost = Math.max(0, Number(w.materialCost) || 0);
      const calc = calculateWorkItemSalary(price, materialCost);

      let category = (w.category && w.category.trim()) || '';
      if (!category) {
        const titleLower = (w.title || '').toLowerCase();
        if (
          titleLower.includes('рихт') ||
          titleLower.includes('стапел') ||
          titleLower.includes('витяж') ||
          titleLower.includes('ремонт крил')
        ) {
          category = 'Рихтувальні роботи';
        } else if (
          titleLower.includes('слюсар') ||
          titleLower.includes('демонт') ||
          titleLower.includes('монтаж') ||
          titleLower.includes('зняття') ||
          titleLower.includes('розбир')
        ) {
          category = 'Слюсарні роботи';
        } else if (
          titleLower.includes('полірув') ||
          titleLower.includes('детейлінг') ||
          titleLower.includes('віск')
        ) {
          category = 'Детейлінг та полірування';
        } else {
          category = 'Підготовка та пофарбування';
        }
      }

      return {
        ...w,
        category,
        price,
        materialCost,
        helperSalary: calc.helperSalary,
        painterSalary: calc.painterSalary,
      };
    });

    const worksTotal = works.reduce((sum, w) => sum + w.price, 0);
    const materialsTotal = (order.materials || []).reduce((sum, m) => sum + (Number(m.total) || 0), 0);
    const totalAmount = worksTotal + materialsTotal;
    const paidAmount = Number(order.paidAmount) || 0;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    return {
      ...order,
      works,
      totalAmount,
      paidAmount,
      remainingAmount,
    };
  }

  // --- Clients ---
  public getClients(): Client[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      return data ? JSON.parse(data) : initialClients;
    } catch {
      return initialClients;
    }
  }

  public saveClient(client: Client): void {
    const clients = this.getClients();
    const index = clients.findIndex((c) => c.id === client.id);
    if (index >= 0) {
      clients[index] = client;
    } else {
      clients.unshift(client);
    }
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    idb.put('clients', client);
    firestoreSync.saveEntity('clients', client);
    this.notify();
  }

  public deleteClient(id: string): void {
    const clients = this.getClients().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    idb.delete('clients', id);
    firestoreSync.deleteEntity('clients', id);
    this.notify();
  }

  // --- Vehicles ---
  public getVehicles(): Vehicle[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VEHICLES);
      return data ? JSON.parse(data) : initialVehicles;
    } catch {
      return initialVehicles;
    }
  }

  public saveVehicle(vehicle: Vehicle): void {
    const vehicles = this.getVehicles();
    const index = vehicles.findIndex((v) => v.id === vehicle.id);
    if (index >= 0) {
      vehicles[index] = vehicle;
    } else {
      vehicles.unshift(vehicle);
    }
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
    idb.put('vehicles', vehicle);
    firestoreSync.saveEntity('vehicles', vehicle);
    this.notify();
  }

  public deleteVehicle(id: string): void {
    const vehicles = this.getVehicles().filter((v) => v.id !== id);
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
    idb.delete('vehicles', id);
    firestoreSync.deleteEntity('vehicles', id);
    this.notify();
  }

  // --- Orders ---
  public getOrders(): Order[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const orders: Order[] = data ? JSON.parse(data) : initialOrders;
      return orders.map((o) => this.sanitizeOrder(o));
    } catch {
      return initialOrders.map((o) => this.sanitizeOrder(o));
    }
  }

  public saveOrder(order: Order): void {
    const sanitized = this.sanitizeOrder(order);
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === sanitized.id);
    if (index >= 0) {
      orders[index] = sanitized;
    } else {
      orders.unshift(sanitized);
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    idb.put('orders', sanitized);
    firestoreSync.saveEntity('orders', sanitized);
    this.notify();
  }

  public updateOrderStatus(orderId: string, status: OrderStatus): void {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      idb.put('orders', order);
      firestoreSync.saveEntity('orders', order);
      this.notify();
    }
  }

  public addOrderPayment(
    orderId: string,
    amount: number,
    paymentMethod: 'cash' | 'card' | 'iban',
    notes?: string
  ): void {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    order.paidAmount = (order.paidAmount || 0) + amount;
    order.remainingAmount = Math.max(0, order.totalAmount - order.paidAmount);

    const newTx: FinanceTransaction = {
      id: 'tx-' + Date.now(),
      type: 'income',
      category: order.paidAmount >= order.totalAmount ? 'Повна оплата' : 'Оплата замовлення',
      amount,
      date: new Date().toISOString().split('T')[0],
      orderId: order.id,
      clientId: order.clientId,
      description: notes || `Оплата по замовленню ${order.orderNumber}`,
      paymentMethod,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    idb.put('orders', order);
    firestoreSync.saveEntity('orders', order);
    this.saveTransaction(newTx);
  }

  public deleteOrder(id: string): void {
    const orders = this.getOrders().filter((o) => o.id !== id);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    idb.delete('orders', id);
    firestoreSync.deleteEntity('orders', id);
    this.notify();
  }

  // --- Inventory ---
  public getInventory(): InventoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      return data ? JSON.parse(data) : initialInventory;
    } catch {
      return initialInventory;
    }
  }

  public saveInventoryItem(item: InventoryItem): void {
    const items = this.getInventory();
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.unshift(item);
    }
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
    idb.put('inventory', item);
    firestoreSync.saveEntity('inventory', item);
    this.notify();
  }

  public deleteInventoryItem(id: string): void {
    const items = this.getInventory().filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
    idb.delete('inventory', id);
    firestoreSync.deleteEntity('inventory', id);
    this.notify();
  }

  // --- Transactions ---
  public getTransactions(): FinanceTransaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : initialTransactions;
    } catch {
      return initialTransactions;
    }
  }

  public saveTransaction(tx: FinanceTransaction): void {
    const txs = this.getTransactions();
    const index = txs.findIndex((t) => t.id === tx.id);
    if (index >= 0) {
      txs[index] = tx;
    } else {
      txs.unshift(tx);
    }
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    idb.put('transactions', tx);
    firestoreSync.saveEntity('finances', tx);
    this.notify();
  }

  public deleteTransaction(id: string): void {
    const txs = this.getTransactions().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    idb.delete('transactions', id);
    firestoreSync.deleteEntity('finances', id);
    this.notify();
  }

  // Explicit sync all to cloud Firestore
  public async syncAllToCloud(): Promise<{ success: boolean; count: number }> {
    return firestoreSync.syncAllData({
      clients: this.getClients(),
      vehicles: this.getVehicles(),
      orders: this.getOrders(),
      inventory: this.getInventory(),
      transactions: this.getTransactions(),
    });
  }

  // --- Clean start for real business (Clear Demo Data) ---
  public clearAllData(): void {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.IS_PRODUCTION_MODE, 'true');
    idb.clearAll();
    this.notify();
  }

  public isProductionMode(): boolean {
    return localStorage.getItem(STORAGE_KEYS.IS_PRODUCTION_MODE) === 'true';
  }

  // --- Reset to initial demo data ---
  public resetToDemoData(): void {
    const sanitizedOrders = initialOrders.map((o) => this.sanitizeOrder(o));
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(initialClients));
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(initialVehicles));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(sanitizedOrders));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(initialInventory));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initialTransactions));
    localStorage.removeItem(STORAGE_KEYS.IS_PRODUCTION_MODE);

    idb.bulkPut('clients', initialClients);
    idb.bulkPut('vehicles', initialVehicles);
    idb.bulkPut('orders', sanitizedOrders);
    idb.bulkPut('inventory', initialInventory);
    idb.bulkPut('transactions', initialTransactions);

    this.notify();
  }

  // --- Export Database to JSON ---
  public exportBackup(): string {
    const dump = {
      version: 1,
      appName: 'AutoPaint CRM',
      exportedAt: new Date().toISOString(),
      clients: this.getClients(),
      vehicles: this.getVehicles(),
      orders: this.getOrders(),
      inventory: this.getInventory(),
      transactions: this.getTransactions(),
    };
    return JSON.stringify(dump, null, 2);
  }

  // --- Import Database from JSON ---
  public importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') return false;

      if (Array.isArray(data.clients)) {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(data.clients));
        idb.bulkPut('clients', data.clients);
      }
      if (Array.isArray(data.vehicles)) {
        localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(data.vehicles));
        idb.bulkPut('vehicles', data.vehicles);
      }
      if (Array.isArray(data.orders)) {
        const sanitized = data.orders.map((o: Order) => this.sanitizeOrder(o));
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(sanitized));
        idb.bulkPut('orders', sanitized);
      }
      if (Array.isArray(data.inventory)) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(data.inventory));
        idb.bulkPut('inventory', data.inventory);
      }
      if (Array.isArray(data.transactions)) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
        idb.bulkPut('transactions', data.transactions);
      }

      this.notify();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

export const storage = new StorageService();
