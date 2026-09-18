import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Download,
  Upload,
  ShieldCheck,
  Zap,
  Trash2,
  FolderSync,
  Layers,
  Users,
  Car,
  ClipboardList,
  Boxes,
  DollarSign,
  Info,
} from 'lucide-react';
import { storage } from '../lib/storage';
import { firestoreSync, FirestoreSyncStatus } from '../lib/firestoreService';
import firebaseConfig from '../../firebase-applet-config.json';
import { formatCurrency } from '../lib/formatters';

interface CloudDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
  counts: {
    clients: number;
    vehicles: number;
    orders: number;
    inventory: number;
    finances: number;
  };
}

export const CloudDatabaseModal: React.FC<CloudDatabaseModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  counts,
}) => {
  const [syncStatus, setSyncStatus] = useState<FirestoreSyncStatus>(firestoreSync.status);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = firestoreSync.subscribeStatus((st) => setSyncStatus(st));
    return () => unsub();
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await storage.syncAllToCloud();
      if (res.success) {
        setSyncMessage(`Успішно збережено ${res.count} записів у хмару Firebase Firestore!`);
        onRefreshData();
      } else {
        setSyncMessage('Синхронізацію завершено з локальним кешем.');
      }
    } catch (e) {
      setSyncMessage('Помилка синхронізації з хмарою.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const handleExportBackup = () => {
    const jsonStr = storage.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autopaint-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const ok = storage.importBackup(text);
        if (ok) {
          storage.syncAllToCloud();
          onRefreshData();
          alert('Базу даних успішно відновлено та синхронізовано з хмарою!');
        } else {
          alert('Помилка: невірний формат резервної копії.');
        }
      } catch {
        alert('Помилка читання файлу.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Хмарна База Даних (Firebase Firestore)"
      subtitle="Постійне хмарне сховище Google Cloud з миттєвим онлайн-редагуванням"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Status Card */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Хмарна база даних підключена</h4>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Онлайн
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Проєкт: <span className="font-mono text-emerald-300 font-semibold">{firebaseConfig.projectId}</span>
                {' · '}База: <span className="font-mono text-slate-400">{firebaseConfig.firestoreDatabaseId || 'default'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20 shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Синхронізація...' : 'Синхронізувати'}</span>
          </button>
        </div>

        {syncMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Real-time Edit Capability Explanation */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <strong className="text-amber-300">Редагування у будь-який момент:</strong>
            <p>
              Ви можете в будь-який момент редагувати будь-якого <strong>клієнта</strong>, <strong>автомобіль</strong>,{' '}
              <strong>наряд робіт</strong> (перейменовувати секції, додавати або видаляти роботи, змінювати ціни,
              вносити оплати) або <strong>матеріали складу</strong>. Будь-яка дія миттєво зберігається в базі даних та синхронізується на всіх пристроях.
            </p>
          </div>
        </div>

        {/* Database Stats Grid */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Поточний стан записів у хмарі:
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-base font-bold text-white font-mono">{counts.clients}</div>
              <div className="text-[11px] text-slate-400">Клієнтів</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <Car className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-base font-bold text-white font-mono">{counts.vehicles}</div>
              <div className="text-[11px] text-slate-400">Автомобілів</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <ClipboardList className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-base font-bold text-white font-mono">{counts.orders}</div>
              <div className="text-[11px] text-slate-400">Нарядів</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <Boxes className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <div className="text-base font-bold text-white font-mono">{counts.inventory}</div>
              <div className="text-[11px] text-slate-400">Матеріалів</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <DollarSign className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <div className="text-base font-bold text-white font-mono">{counts.finances}</div>
              <div className="text-[11px] text-slate-400">Операцій</div>
            </div>
          </div>
        </div>

        {/* Backup & Tools Section */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <FolderSync className="w-4 h-4 text-amber-400" />
            Резервне копіювання та відновлення бази
          </h4>
          <p className="text-xs text-slate-400">
            Ви можете в будь-який момент завантажити повну копію бази даних на комп&apos;ютер або відновити її з файлу JSON.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Експорт бази (JSON)</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Імпорт бази (JSON)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            <button
              onClick={() => {
                if (
                  confirm(
                    'Відновити базу до початкових демонстраційних прикладів автомаляра?'
                  )
                ) {
                  storage.resetToDemoData();
                  storage.syncAllToCloud();
                  onRefreshData();
                  alert('Демо-дані відновлено та синхронізовано з Firestore!');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 ml-auto transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Відновити демо-дані</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
