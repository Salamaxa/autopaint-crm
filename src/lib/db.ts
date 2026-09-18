/**
 * AutoPaint CRM Database Layer (IndexedDB Engine)
 * Забезпечує надійне збереження даних у локальній базі даних браузера IndexedDB
 * з підтримкою експорту/імпорту резервних копій та синхронізації.
 */

import { Client, Vehicle, Order, InventoryItem, FinanceTransaction } from '../types';

const DB_NAME = 'AutoPaintCRM_DB';
const DB_VERSION = 1;

export interface DatabaseDump {
  version: number;
  exportedAt: string;
  clients: Client[];
  vehicles: Vehicle[];
  orders: Order[];
  inventory: InventoryItem[];
  transactions: FinanceTransaction[];
}

class IndexedDBStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains('clients')) {
            db.createObjectStore('clients', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('vehicles')) {
            db.createObjectStore('vehicles', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('orders')) {
            db.createObjectStore('orders', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('inventory')) {
            db.createObjectStore('inventory', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('transactions')) {
            db.createObjectStore('transactions', { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    }

    return this.dbPromise;
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`IndexedDB getAll(${storeName}) failed:`, e);
      return [];
    }
  }

  public async put<T>(storeName: string, item: T): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`IndexedDB put(${storeName}) failed:`, e);
    }
  }

  public async delete(storeName: string, key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`IndexedDB delete(${storeName}, ${key}) failed:`, e);
    }
  }

  public async bulkPut<T>(storeName: string, items: T[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();
        for (const item of items) {
          store.put(item);
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.warn(`IndexedDB bulkPut(${storeName}) failed:`, e);
    }
  }

  public async clearAll(): Promise<void> {
    try {
      const db = await this.getDB();
      const storeNames = ['clients', 'vehicles', 'orders', 'inventory', 'transactions'];
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeNames, 'readwrite');
        storeNames.forEach((name) => {
          transaction.objectStore(name).clear();
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.warn('IndexedDB clearAll failed:', e);
    }
  }
}

export const idb = new IndexedDBStorage();
