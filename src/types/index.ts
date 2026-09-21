export type OrderStatus =
  | 'new'          // Нове
  | 'preparation'  // Підготовка / Рихтування
  | 'painting'     // Фарбування
  | 'polishing'    // Сушка / Полірування
  | 'ready'        // Готове до видачі
  | 'delivered'    // Видано
  | 'cancelled';   // Скасовано

export interface Client {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  clientId: string;
  make: string;
  model: string;
  licensePlate: string;
  vin: string;
  year?: number;
  colorName?: string;
  colorCode?: string; // Код фарби авто (наприклад, LC9X, 1F7, 475)
  notes?: string;
  createdAt: string;
}

export type WorkCategory =
  | 'Підготовка та пофарбування'
  | 'Рихтувальні роботи'
  | 'Слюсарні роботи'
  | 'Детейлінг та полірування'
  | 'Інші роботи';

export const WORK_CATEGORIES: WorkCategory[] = [
  'Підготовка та пофарбування',
  'Рихтувальні роботи',
  'Слюсарні роботи',
  'Детейлінг та полірування',
  'Інші роботи',
];

export interface OrderWorkItem {
  id: string;
  category?: WorkCategory | string; // Секція/категорія роботи (напр. "Підготовка та пофарбування", "Рихтувальні роботи", "Слюсарні роботи")
  title: string; // Назва роботи (наприклад, "пофарбування бампера")
  price: number; // Ціна роботи в ₴
  materialCost: number; // Вартість використаних матеріалів на цю роботу в ₴
  helperSalary: number; // Зарплата підготовщика: (ціна - матеріали) / 2
  notes?: string;
}

export interface OrderMaterialItem {
  id: string;
  inventoryId?: string; // Прив'язка до складу
  name: string;
  quantity: number;
  unit: string;
  price: number; // Вартість за одиницю
  total: number;
}

export interface OrderPartItem {
  id: string;
  name: string; // Назва запчастини (напр. "Передній бампер", "Крило ліве", "Фара LED")
  price: number; // Ціна запчастини в ₴
  delivery: number; // Доставка запчастини в ₴
  deliveryCost?: number; // Сумісність для назви
  total: number; // Разом сума (ціна + доставка)
}

export interface Order {
  id: string;
  orderNumber: string; // Номер замовлення (наприклад, №2024-042)
  clientId: string;
  vehicleId: string;
  date: string;
  deadlineDate?: string;
  status: OrderStatus;
  works: OrderWorkItem[];
  materials?: OrderMaterialItem[];
  parts?: OrderPartItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number; // Залишок (борг)
  notes?: string;
  createdAt: string;
}

export type InventoryCategory =
  | 'paints'      // Базові фарби та пігменти
  | 'clearcoats'  // Лаки та затверджувачі
  | 'primers'     // Ґрунти (акрилові, епоксидні)
  | 'putties'     // Шпаклівки
  | 'abrasives'   // Абразивні матеріали
  | 'masking'     // Маскувальні стрічки та плівки
  | 'chemicals'   // Знежирювачі, розчинники
  | 'tools';      // Інструменти та ЗІЗ

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string; // Артикул або код товару
  category: InventoryCategory;
  unit: string; // л, мл, кг, г, шт, балон, рулон
  quantity: number;
  minQuantity: number; // Поріг попередження
  price: number; // Собівартість / ціна закупівлі
  retailPrice?: number; // Роздрібна ціна
  supplier?: string;
  notes?: string;
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'cash' | 'card' | 'iban';

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  orderId?: string;
  clientId?: string;
  description: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'clients'
  | 'vehicles'
  | 'orders'
  | 'inventory'
  | 'finances';
