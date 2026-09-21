import React from 'react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  activeOrdersCount: number;
  lowStockCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  activeOrdersCount,
  lowStockCount,
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Головна панель';
      case 'orders':
        return 'Замовлення та наряди';
      case 'clients':
        return 'Клієнти';
      case 'vehicles':
        return 'Автомобілі';
      case 'inventory':
        return 'Склад матеріалів';
      case 'finances':
        return 'Фінанси та борги';
      default:
        return 'AutoPaint CRM';
    }
  };

  return (
    <header className="hidden md:flex items-center justify-between px-6 py-4 bg-[#0d131f]/90 backdrop-blur border-b border-slate-800/80 sticky top-0 z-20">
      {/* Tab Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-extrabold text-white tracking-tight">{getTabTitle()}</h2>
        {activeTab === 'orders' && activeOrdersCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {activeOrdersCount} в роботі
          </span>
        )}
        {activeTab === 'inventory' && lowStockCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {lowStockCount} дефіцит
          </span>
        )}
      </div>

    </header>
  );
};
