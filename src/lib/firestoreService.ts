import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Client, Vehicle, Order, InventoryItem, FinanceTransaction } from '../types';

export type FirestoreSyncStatus = 'connecting' | 'connected' | 'offline' | 'error';

class FirestoreSyncService {
  public status: FirestoreSyncStatus = 'connecting';
  private statusListeners: Set<(status: FirestoreSyncStatus) => void> = new Set();

  public subscribeStatus(cb: (status: FirestoreSyncStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  private setStatus(newStatus: FirestoreSyncStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((cb) => {
        try {
          cb(newStatus);
        } catch (e) {
          console.error('Error notifying status listener:', e);
        }
      });
    }
  }

  // Generic real-time listener
  public subscribeToCollection<T extends { id: string }>(
    colName: 'clients' | 'vehicles' | 'orders' | 'inventory' | 'finances',
    onData: (items: T[]) => void
  ): () => void {
    try {
      const colRef = collection(db, colName);
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          this.setStatus('connected');
          const items: T[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            items.push({ ...(data as T), id: d.id });
          });
          onData(items);
        },
        (error) => {
          const msg = error?.message || String(error);
          if (error?.code === 'unavailable' || msg.includes('unavailable') || msg.includes('offline')) {
            // Transient offline state: Firestore SDK will automatically reconnect in the background
            this.setStatus('offline');
          } else {
            console.warn(`Firestore subscription error for [${colName}]:`, error);
            this.setStatus('error');
          }
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn(`Could not start Firestore listener for ${colName}:`, e);
      this.setStatus('offline');
      return () => {};
    }
  }

  // Save/Update single entity (Upsert)
  public async saveEntity<T extends { id: string }>(
    colName: 'clients' | 'vehicles' | 'orders' | 'inventory' | 'finances',
    item: T
  ): Promise<void> {
    try {
      const docRef = doc(db, colName, item.id);
      // Clean undefined fields to avoid Firestore errors
      const sanitized = JSON.parse(JSON.stringify(item));
      await setDoc(docRef, sanitized, { merge: true });
      this.setStatus('connected');
    } catch (e) {
      console.error(`Failed to save to Firestore [${colName}/${item.id}]:`, e);
    }
  }

  // Delete entity
  public async deleteEntity(
    colName: 'clients' | 'vehicles' | 'orders' | 'inventory' | 'finances',
    id: string
  ): Promise<void> {
    try {
      const docRef = doc(db, colName, id);
      await deleteDoc(docRef);
      this.setStatus('connected');
    } catch (e) {
      console.error(`Failed to delete from Firestore [${colName}/${id}]:`, e);
    }
  }

  // Check if a collection is empty
  public async isCollectionEmpty(
    colName: 'clients' | 'vehicles' | 'orders' | 'inventory' | 'finances'
  ): Promise<boolean> {
    try {
      const snap = await getDocs(collection(db, colName));
      return snap.empty;
    } catch {
      return false;
    }
  }

  // Delete all documents in a collection in Firestore
  public async clearCollection(
    colName: 'clients' | 'vehicles' | 'orders' | 'inventory' | 'finances'
  ): Promise<void> {
    try {
      const snap = await getDocs(collection(db, colName));
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      this.setStatus('connected');
    } catch (e) {
      console.error(`Failed to clear collection [${colName}]:`, e);
    }
  }

  // Clear all collections in Firestore
  public async clearAllCollections(): Promise<void> {
    try {
      await Promise.all([
        this.clearCollection('clients'),
        this.clearCollection('vehicles'),
        this.clearCollection('orders'),
        this.clearCollection('inventory'),
        this.clearCollection('finances'),
      ]);
      this.setStatus('connected');
    } catch (e) {
      console.error('Failed to clear all collections:', e);
    }
  }

  // Batch sync all records to Firestore
  public async syncAllData(data: {
    clients: Client[];
    vehicles: Vehicle[];
    orders: Order[];
    inventory: InventoryItem[];
    transactions: FinanceTransaction[];
  }): Promise<{ success: boolean; count: number }> {
    try {
      const batch = writeBatch(db);
      let count = 0;

      data.clients.forEach((c) => {
        batch.set(doc(db, 'clients', c.id), JSON.parse(JSON.stringify(c)), { merge: true });
        count++;
      });
      data.vehicles.forEach((v) => {
        batch.set(doc(db, 'vehicles', v.id), JSON.parse(JSON.stringify(v)), { merge: true });
        count++;
      });
      data.orders.forEach((o) => {
        batch.set(doc(db, 'orders', o.id), JSON.parse(JSON.stringify(o)), { merge: true });
        count++;
      });
      data.inventory.forEach((i) => {
        batch.set(doc(db, 'inventory', i.id), JSON.parse(JSON.stringify(i)), { merge: true });
        count++;
      });
      data.transactions.forEach((t) => {
        batch.set(doc(db, 'finances', t.id), JSON.parse(JSON.stringify(t)), { merge: true });
        count++;
      });

      await batch.commit();
      this.setStatus('connected');
      return { success: true, count };
    } catch (e) {
      console.error('Batch sync to Firestore failed:', e);
      return { success: false, count: 0 };
    }
  }
}

export const firestoreSync = new FirestoreSyncService();
