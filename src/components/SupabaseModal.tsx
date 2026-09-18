import React, { useState } from 'react';
import { Modal } from './Modal';
import { isSupabaseConfigured, SUPABASE_SQL_SCHEMA } from '../lib/supabase';
import { Database, Copy, Check, ExternalLink, ShieldCheck, HardDrive, RefreshCw } from 'lucide-react';
import { storage } from '../lib/storage';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetDemoData: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onResetDemoData,
}) => {
  const [copied, setCopied] = useState(false);
  const isConfigured = isSupabaseConfigured();

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Підключення Supabase (База Даних)"
      subtitle="Поточний стан сховища та підготовка до інтеграції з хмарою"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Status card */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-3">
          <div className={`p-2.5 rounded-lg ${isConfigured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {isConfigured ? <ShieldCheck className="w-6 h-6" /> : <HardDrive className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white">
                {isConfigured ? 'Підключено до хмари Supabase' : 'Демонстраційний режим (Локальне сховище)'}
              </h4>
              <span className={`px-2 py-0.5 text-xs rounded font-medium ${isConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {isConfigured ? 'Live Supabase' : 'Offline / LocalStorage'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isConfigured
                ? 'CRM підключено до реального проєкту Supabase. Всі клієнти, автомобілі, замовлення, склад та фінанси синхронізуються з хмарною PostgreSQL.'
                : 'Зараз система працює на швидкому локальному браузерному сховищі з демонстраційними даними. Всі ваші створення, редагування та платежі повністю зберігаються в браузері.'}
            </p>
          </div>
        </div>

        {/* Steps to connect */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            Як підключити власний проєкт Supabase:
          </h4>
          <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside pl-1 leading-relaxed">
            <li>
              Зареєструйте безкоштовний проєкт на{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline inline-flex items-center gap-1"
              >
                supabase.com <ExternalLink className="w-3 h-3 inline" />
              </a>
            </li>
            <li>
              Відкрийте вкладку <strong>SQL Editor</strong> у панелі Supabase та виконайте підготовлений SQL-код нижче.
            </li>
            <li>
              Скопіюйте ваші <strong>Project URL</strong> та <strong>anon public API key</strong> з налаштувань проєкту (Settings → API).
            </li>
            <li>
              Вкажіть змінні середовища <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">VITE_SUPABASE_URL</code> та{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">VITE_SUPABASE_ANON_KEY</code> у налаштуваннях проєкту або файлі <code className="text-slate-200">.env</code>.
            </li>
          </ol>
        </div>

        {/* SQL Schema snippet with copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Готовий SQL DDL-скрипт для Supabase (всі 5 таблиць, індекси та RLS):
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5 text-slate-950" />}
              {copied ? 'Скопійовано!' : 'Копіювати SQL'}
            </button>
          </div>
          <div className="relative rounded-xl border border-slate-800 bg-[#0a0e17] overflow-hidden">
            <pre className="p-3 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto leading-relaxed">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>

        {/* Demo reset option */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Бажаєте скинути дані до заводських демо-записів автомаляра?
          </div>
          <button
            onClick={() => {
              if (confirm('Скинути всі дані до початкових демонстраційних значень автомаляра?')) {
                storage.resetToDemoData();
                onResetDemoData();
                onClose();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Відновити демо-дані
          </button>
        </div>
      </div>
    </Modal>
  );
};
