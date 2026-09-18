import { OrderWorkItem, OrderMaterialItem } from '../types';

export interface WorkSalaryCalculation {
  price: number;
  materialCost: number;
  helperSalary: number;
  painterSalary: number;
  netWorkAmount: number; // price - materialCost
  isMaterialExceeded: boolean; // true if materialCost > price
  difference: number; // how much material exceeds or profit
}

/**
 * Розрахунок зарплати для окремої роботи в наряді:
 * Формула: (ціна роботи - вартість матеріалів) / 2
 * Якщо матеріали коштують більше ніж ціна роботи:
 * - зарплата не може бути від'ємною (0 ₴)
 * - формується прапорець попередження (isMaterialExceeded)
 */
export function calculateWorkItemSalary(price: number, materialCost: number): WorkSalaryCalculation {
  const p = Math.max(0, Number(price) || 0);
  const m = Math.max(0, Number(materialCost) || 0);
  const net = p - m;

  if (m > p) {
    return {
      price: p,
      materialCost: m,
      helperSalary: 0,
      painterSalary: 0,
      netWorkAmount: net,
      isMaterialExceeded: true,
      difference: m - p,
    };
  }

  const half = Math.round((net / 2) * 100) / 100;

  return {
    price: p,
    materialCost: m,
    helperSalary: half,
    painterSalary: half,
    netWorkAmount: net,
    isMaterialExceeded: false,
    difference: net,
  };
}

export interface OrderSalarySummary {
  totalWorksPrice: number;       // Загальна сума робіт
  totalWorkMaterials: number;     // Матеріали, списані на роботи
  totalHelperSalary: number;      // Зарплата підготовщика
  totalPainterSalary: number;     // Частка маляра
  totalPayroll: number;           // Загальний фонд зарплати (підготовщик + маляр)
  totalOrderMaterials: number;    // Додаткові матеріали наряду (зі складу)
  totalAllMaterials: number;      // Всі матеріали разом
  hasMaterialExceeded: boolean;   // Чи є хоча б одна робота з перевищенням матеріалів
  exceededCount: number;          // Кількість робіт з попередженням
  workshopProfit: number;         // Чистий залишок майстерні з робіт після ЗП та матеріалів робіт
  marginPercent: number;          // Маржинальність (%)
}

/**
 * Повний зведений розрахунок зарплат та фінансів по наряду-замовленню
 */
export function calculateOrderSalarySummary(
  works: OrderWorkItem[] = [],
  materials: OrderMaterialItem[] = []
): OrderSalarySummary {
  let totalWorksPrice = 0;
  let totalWorkMaterials = 0;
  let totalHelperSalary = 0;
  let totalPainterSalary = 0;
  let exceededCount = 0;

  works.forEach((w) => {
    const p = Math.max(0, Number(w.price) || 0);
    const m = Math.max(0, Number(w.materialCost) || 0);
    totalWorksPrice += p;
    totalWorkMaterials += m;

    const calc = calculateWorkItemSalary(p, m);
    totalHelperSalary += calc.helperSalary;
    totalPainterSalary += calc.painterSalary;

    if (calc.isMaterialExceeded) {
      exceededCount++;
    }
  });

  const totalOrderMaterials = (materials || []).reduce(
    (sum, m) => sum + (Number(m.total) || 0),
    0
  );

  const totalPayroll = totalHelperSalary + totalPainterSalary;
  const totalAllMaterials = totalWorkMaterials + totalOrderMaterials;

  // Чистий дохід автомайстерні від вартості робіт після виплати матеріалів та зарплати
  const workshopProfit = Math.max(0, totalWorksPrice - totalWorkMaterials - totalPayroll);
  const marginPercent = totalWorksPrice > 0 ? Math.round((workshopProfit / totalWorksPrice) * 100) : 0;

  return {
    totalWorksPrice,
    totalWorkMaterials,
    totalHelperSalary,
    totalPainterSalary,
    totalPayroll,
    totalOrderMaterials,
    totalAllMaterials,
    hasMaterialExceeded: exceededCount > 0,
    exceededCount,
    workshopProfit,
    marginPercent,
  };
}

export interface WorkCategoryGroup {
  category: string;
  works: OrderWorkItem[];
  totalPrice: number;
  totalMaterialCost: number;
  totalHelperSalary: number;
  totalPainterSalary: number;
  totalNet: number;
}

/**
 * Групування переліку робіт за секціями:
 * - Підготовка та пофарбування
 * - Рихтувальні роботи
 * - Слюсарні роботи
 * - Детейлінг та полірування
 * - Інші роботи
 */
export function groupWorksByCategory(works: OrderWorkItem[] = []): WorkCategoryGroup[] {
  const groups: Record<string, OrderWorkItem[]> = {};
  const orderedCatNames: string[] = [];

  works.forEach((w) => {
    let cat = (w.category && w.category.trim()) || '';
    if (!cat) {
      const titleLower = (w.title || '').toLowerCase();
      if (
        titleLower.includes('рихт') ||
        titleLower.includes('стапел') ||
        titleLower.includes('витяж') ||
        titleLower.includes('ремонт крил')
      ) {
        cat = 'Рихтувальні роботи';
      } else if (
        titleLower.includes('слюсар') ||
        titleLower.includes('демонт') ||
        titleLower.includes('монтаж') ||
        titleLower.includes('зняття') ||
        titleLower.includes('розбир')
      ) {
        cat = 'Слюсарні роботи';
      } else if (
        titleLower.includes('полірув') ||
        titleLower.includes('детейлінг') ||
        titleLower.includes('віск')
      ) {
        cat = 'Детейлінг та полірування';
      } else {
        cat = 'Підготовка та пофарбування';
      }
    }

    if (!groups[cat]) {
      groups[cat] = [];
      orderedCatNames.push(cat);
    }
    groups[cat].push({ ...w, category: cat });
  });

  return orderedCatNames.map((cat) => {
    const list = groups[cat];
    let totalPrice = 0;
    let totalMaterialCost = 0;
    let totalHelperSalary = 0;
    let totalPainterSalary = 0;

    list.forEach((w) => {
      const p = Math.max(0, Number(w.price) || 0);
      const m = Math.max(0, Number(w.materialCost) || 0);
      const calc = calculateWorkItemSalary(p, m);
      totalPrice += p;
      totalMaterialCost += m;
      totalHelperSalary += calc.helperSalary;
      totalPainterSalary += calc.painterSalary;
    });

    return {
      category: cat,
      works: list,
      totalPrice,
      totalMaterialCost,
      totalHelperSalary,
      totalPainterSalary,
      totalNet: Math.max(0, totalPrice - totalMaterialCost),
    };
  });
}
