import { OrderWorkItem, OrderMaterialItem } from '../types';

export interface WorkSalaryCalculation {
  price: number;
  materialCost: number;
  helperSalary: number;
  netWorkAmount: number; // price - materialCost
  isMaterialExceeded: boolean; // true if materialCost > price
  difference: number; // how much material exceeds or profit
}

/**
 * Розрахунок зарплати для окремої роботи в наряді:
 * Формула для підготовщика: (ціна роботи - вартість матеріалів) / 2
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
      netWorkAmount: net,
      isMaterialExceeded: true,
      difference: m - p,
    };
  }

  const helperSalary = Math.round((net / 2) * 100) / 100;

  return {
    price: p,
    materialCost: m,
    helperSalary,
    netWorkAmount: net,
    isMaterialExceeded: false,
    difference: net,
  };
}

export interface OrderSalarySummary {
  totalWorksPrice: number;        // Загальна сума робіт
  totalWorkMaterials: number;     // Матеріали, прив'язані до окремих робіт
  totalOrderMaterials: number;    // Витрачені матеріали та деталі наряду (зі складу / кошторис)
  totalAllMaterials: number;      // Всі витрачені матеріали (роботи + наряд)
  salaryBase: number;             // Чиста база для розрахунку ЗП (Сума робіт - Матеріали)
  totalHelperSalary: number;      // Зарплата підготовщика: 50% від чистої бази робіт
  hasMaterialExceeded: boolean;   // Чи є перевищення матеріалів над сумою робіт
  exceededCount: number;          // Кількість робіт/нарядів з перевищенням
}

/**
 * Зведений розрахунок зарплати підготовщика та матеріалів по наряду-замовленню
 * Формула: (Сума робіт - Всі витрачені матеріали) / 2
 */
export function calculateOrderSalarySummary(
  works: OrderWorkItem[] = [],
  materials: OrderMaterialItem[] = []
): OrderSalarySummary {
  let totalWorksPrice = 0;
  let totalWorkMaterials = 0;
  let exceededCount = 0;

  works.forEach((w) => {
    const p = Math.max(0, Number(w.price) || 0);
    const m = Math.max(0, Number(w.materialCost) || 0);
    totalWorksPrice += p;
    totalWorkMaterials += m;

    if (m > p) {
      exceededCount++;
    }
  });

  const totalOrderMaterials = (materials || []).reduce(
    (sum, m) => sum + (Number(m.total) || 0),
    0
  );

  // Всі витрачені матеріали: матеріали окремих робіт + витрачені матеріали наряду (зі складу/кошторису)
  const totalAllMaterials = totalWorkMaterials + totalOrderMaterials;

  // База для ЗП: (Сума робіт - Всі витрачені матеріали)
  const salaryBase = Math.max(0, totalWorksPrice - totalAllMaterials);

  // Зарплата підготовщика (50% від бази після вирахування матеріалів)
  const totalHelperSalary = Math.round((salaryBase / 2) * 100) / 100;

  if (totalAllMaterials > totalWorksPrice && totalWorksPrice > 0) {
    exceededCount = Math.max(1, exceededCount);
  }

  return {
    totalWorksPrice,
    totalWorkMaterials,
    totalOrderMaterials,
    totalAllMaterials,
    salaryBase,
    totalHelperSalary,
    hasMaterialExceeded: exceededCount > 0,
    exceededCount,
  };
}

export interface WorkCategoryGroup {
  category: string;
  works: (OrderWorkItem & {
    orderMaterialShare?: number;
    totalEffectiveMaterial?: number;
    effectiveNet?: number;
    effectiveHelperSalary?: number;
  })[];
  totalPrice: number;
  totalMaterialCost: number;
  totalHelperSalary: number;
  totalNet: number;
}

/**
 * Групування переліку робіт за секціями з урахуванням витрачених матеріалів наряду:
 * - Підготовка та пофарбування
 * - Рихтувальні роботи
 * - Слюсарні роботи
 * - Детейлінг та полірування
 * - Інші роботи
 */
export function groupWorksByCategory(
  works: OrderWorkItem[] = [],
  orderMaterialsTotal: number = 0
): WorkCategoryGroup[] {
  const groups: Record<string, OrderWorkItem[]> = {};
  const orderedCatNames: string[] = [];

  let overallWorksPrice = 0;
  works.forEach((w) => {
    overallWorksPrice += Math.max(0, Number(w.price) || 0);
  });

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

    const enrichedWorks = list.map((w) => {
      const p = Math.max(0, Number(w.price) || 0);
      const m = Math.max(0, Number(w.materialCost) || 0);

      // Пропорційний розподіл матеріалів наряду (якщо вони є)
      const orderMaterialShare =
        orderMaterialsTotal > 0 && overallWorksPrice > 0
          ? Math.round((p / overallWorksPrice) * orderMaterialsTotal * 100) / 100
          : 0;

      const totalEffectiveMaterial = m + orderMaterialShare;
      const effectiveNet = Math.max(0, p - totalEffectiveMaterial);
      const effectiveHelperSalary = Math.round((effectiveNet / 2) * 100) / 100;

      totalPrice += p;
      totalMaterialCost += totalEffectiveMaterial;
      totalHelperSalary += effectiveHelperSalary;

      return {
        ...w,
        category: cat,
        orderMaterialShare,
        totalEffectiveMaterial,
        effectiveNet,
        effectiveHelperSalary,
      };
    });

    return {
      category: cat,
      works: enrichedWorks,
      totalPrice,
      totalMaterialCost,
      totalHelperSalary,
      totalNet: Math.max(0, totalPrice - totalMaterialCost),
    };
  });
}
