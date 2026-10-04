export type TransactionKind = 'saving' | 'expense';

export interface FinanceCategory {
  id: string;
  kind: TransactionKind;
  name: string;
  color: string;
  isDefault: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
}

export interface FinanceTransaction {
  id: string;
  kind: TransactionKind;
  amount: number;
  date: string;
  categoryId: string;
  memo: string;
  goalId?: string;
}

export interface FinanceData {
  version: 2;
  categories: FinanceCategory[];
  goals: SavingsGoal[];
  transactions: FinanceTransaction[];
}

export interface FinanceLoadResult {
  data: FinanceData;
  warning: string | null;
  persistenceBlocked: boolean;
}

export const FINANCE_STORAGE_KEY = 'moru-finance-data-v2';
export const LEGACY_STORAGE_KEY = 'moru-savings-contributions-v1';
export const DEFAULT_GOAL_ID = 'goal-emergency';

export const DEFAULT_CATEGORIES: FinanceCategory[] = [
  { id: 'saving-allowance', kind: 'saving', name: '용돈', color: '#84bd90', isDefault: true },
  { id: 'saving-part-time', kind: 'saving', name: '알바', color: '#719d7a', isDefault: true },
  { id: 'saving-gift', kind: 'saving', name: '선물', color: '#8eaa80', isDefault: true },
  { id: 'saving-scholarship', kind: 'saving', name: '장학금', color: '#6f9b8c', isDefault: true },
  { id: 'saving-other', kind: 'saving', name: '기타', color: '#768579', isDefault: true },
  { id: 'expense-food', kind: 'expense', name: '식비', color: '#b57970', isDefault: true },
  { id: 'expense-transport', kind: 'expense', name: '교통', color: '#aa8173', isDefault: true },
  { id: 'expense-shopping', kind: 'expense', name: '쇼핑', color: '#a5797f', isDefault: true },
  { id: 'expense-leisure', kind: 'expense', name: '여가', color: '#a28a74', isDefault: true },
  { id: 'expense-living', kind: 'expense', name: '생활', color: '#9d8174', isDefault: true },
  { id: 'expense-education', kind: 'expense', name: '교육', color: '#958070', isDefault: true },
  { id: 'expense-other', kind: 'expense', name: '기타', color: '#85827a', isDefault: true },
];

const STARTER_GOAL: SavingsGoal = {
  id: DEFAULT_GOAL_ID,
  name: '마음 편한 비상금',
  targetAmount: 1_970_000,
};

const HISTORICAL_SAVINGS = [
  { monthOffset: -6, amount: 760_000, categoryId: 'saving-other', memo: '기존 저축 잔액' },
  { monthOffset: -5, amount: 85_000, categoryId: 'saving-part-time', memo: '알바 수입 저축' },
  { monthOffset: -4, amount: 85_000, categoryId: 'saving-allowance', memo: '용돈 저축' },
  { monthOffset: -3, amount: 145_000, categoryId: 'saving-scholarship', memo: '장학금 저축' },
  { monthOffset: -2, amount: 135_000, categoryId: 'saving-gift', memo: '선물 받은 금액 저축' },
  { monthOffset: -1, amount: 90_000, categoryId: 'saving-allowance', memo: '월간 저축' },
] as const;

function localDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayKey(now = new Date()): string {
  return localDate(now.getFullYear(), now.getMonth(), now.getDate());
}

export function monthKey(date: string | Date): string {
  if (date instanceof Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  return date.slice(0, 7);
}

function monthDate(monthOffset: number, day: number, now: Date): string {
  const firstOfCurrent = new Date(now.getFullYear(), now.getMonth(), 1, 12);
  firstOfCurrent.setMonth(firstOfCurrent.getMonth() + monthOffset);
  const lastDay = new Date(firstOfCurrent.getFullYear(), firstOfCurrent.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay, monthOffset === 0 ? now.getDate() : lastDay);
  return localDate(firstOfCurrent.getFullYear(), firstOfCurrent.getMonth(), Math.max(1, safeDay));
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createStarterData(now = new Date()): FinanceData {
  const transactions: FinanceTransaction[] = HISTORICAL_SAVINGS.map((item, index) => ({
    id: `starter-saving-${index}`,
    kind: 'saving',
    amount: item.amount,
    date: monthDate(item.monthOffset, 12, now),
    categoryId: item.categoryId,
    memo: item.memo,
    goalId: STARTER_GOAL.id,
  }));

  transactions.push(
    {
      id: 'starter-saving-current-allowance',
      kind: 'saving',
      amount: 80_000,
      date: monthDate(0, 3, now),
      categoryId: 'saving-allowance',
      memo: '매달 꾸준히 쌓아가는 중',
      goalId: STARTER_GOAL.id,
    },
    {
      id: 'starter-saving-current-part-time',
      kind: 'saving',
      amount: 40_000,
      date: monthDate(0, 12, now),
      categoryId: 'saving-part-time',
      memo: '작은 여유를 미래로',
      goalId: STARTER_GOAL.id,
    },
    {
      id: 'starter-expense-food',
      kind: 'expense',
      amount: 785_000,
      date: monthDate(0, 2, now),
      categoryId: 'expense-food',
      memo: '식사와 일상의 소비',
    },
    {
      id: 'starter-expense-living',
      kind: 'expense',
      amount: 640_000,
      date: monthDate(0, 3, now),
      categoryId: 'expense-living',
      memo: '주거 · 공과금',
    },
    {
      id: 'starter-expense-transport',
      kind: 'expense',
      amount: 385_000,
      date: monthDate(0, 3, now),
      categoryId: 'expense-transport',
      memo: '이동 비용',
    },
    {
      id: 'starter-expense-leisure',
      kind: 'expense',
      amount: 330_000,
      date: monthDate(0, 4, now),
      categoryId: 'expense-leisure',
      memo: '나를 위한 작은 여유',
    },
  );

  return {
    version: 2,
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    goals: [{ ...STARTER_GOAL }],
    transactions,
  };
}

function isKind(value: unknown): value is TransactionKind {
  return value === 'saving' || value === 'expense';
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function legacyDateKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const firstTen = value.slice(0, 10);
  if (isDateKey(firstTen)) return firstTen;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : todayKey(parsed);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeFinanceData(raw: unknown): { data: FinanceData | null; hasInvalidRows: boolean } {
  if (!isRecord(raw) || raw.version !== 2 || !Array.isArray(raw.categories) ||
      !Array.isArray(raw.goals) || !Array.isArray(raw.transactions)) {
    return { data: null, hasInvalidRows: true };
  }

  const categories: FinanceCategory[] = [];
  const categoryIds = new Set<string>();
  let hasInvalidRows = false;
  for (const item of raw.categories) {
    if (!isRecord(item) || typeof item.id !== 'string' || !isKind(item.kind) ||
        typeof item.name !== 'string' || !item.name.trim() || typeof item.color !== 'string') {
      hasInvalidRows = true;
      continue;
    }
    if (categoryIds.has(item.id)) {
      hasInvalidRows = true;
      continue;
    }
    categoryIds.add(item.id);
    categories.push({
      id: item.id,
      kind: item.kind,
      name: item.name.trim().slice(0, 40),
      color: item.color,
      isDefault: item.isDefault === true,
    });
  }

  const goals: SavingsGoal[] = [];
  const goalIds = new Set<string>();
  for (const item of raw.goals) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string' ||
        !item.name.trim() || !Number.isSafeInteger(item.targetAmount) || Number(item.targetAmount) <= 0) {
      hasInvalidRows = true;
      continue;
    }
    if (goalIds.has(item.id)) {
      hasInvalidRows = true;
      continue;
    }
    goalIds.add(item.id);
    goals.push({
      id: item.id,
      name: item.name.trim().slice(0, 60),
      targetAmount: Number(item.targetAmount),
    });
  }

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const goalMap = new Map(goals.map((goal) => [goal.id, goal]));
  const transactions: FinanceTransaction[] = [];
  const transactionIds = new Set<string>();
  for (const item of raw.transactions) {
    if (!isRecord(item) || typeof item.id !== 'string' || !isKind(item.kind) ||
        !Number.isSafeInteger(item.amount) || Number(item.amount) <= 0 || !isDateKey(item.date) ||
        typeof item.categoryId !== 'string' || typeof item.memo !== 'string') {
      hasInvalidRows = true;
      continue;
    }
    if (transactionIds.has(item.id)) {
      hasInvalidRows = true;
      continue;
    }
    transactionIds.add(item.id);
    const matchingCategory = categoryMap.get(item.categoryId);
    const fallbackCategory = categories.find((category) => category.kind === item.kind);
    const category = matchingCategory?.kind === item.kind
      ? matchingCategory
      : fallbackCategory;
    if (!category) {
      hasInvalidRows = true;
      continue;
    }
    transactions.push({
      id: item.id,
      kind: item.kind,
      amount: Number(item.amount),
      date: item.date,
      categoryId: category.id,
      memo: item.memo.slice(0, 200),
      ...(typeof item.goalId === 'string' && goalMap.has(item.goalId) && item.kind === 'saving'
        ? { goalId: item.goalId }
        : {}),
    });
  }

  return {
    data: { version: 2, categories, goals, transactions },
    hasInvalidRows,
  };
}

function migrateLegacyContributions(raw: string | null, starter: FinanceData): {
  transactions: FinanceTransaction[];
  warning: string | null;
} {
  if (!raw) return { transactions: [], warning: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { transactions: [], warning: '이전 저축 기록 형식을 확인할 수 없어 원본을 보관했습니다.' };
    }
    const transactions: FinanceTransaction[] = [];
    let skipped = false;
    for (const item of parsed) {
      if (!isRecord(item) || typeof item.id !== 'string' || !Number.isSafeInteger(item.amount) ||
          Number(item.amount) <= 0) {
        skipped = true;
        continue;
      }
      const date = legacyDateKey(item.date);
      if (!date) {
        skipped = true;
        continue;
      }
      transactions.push({
        id: `legacy-${item.id}`,
        kind: 'saving',
        amount: Number(item.amount),
        date,
        categoryId: 'saving-other',
        memo: '이전 저축 기록에서 가져옴',
        goalId: starter.goals[0]?.id,
      });
    }
    return {
      transactions,
      warning: skipped ? '일부 형식이 다른 이전 기록은 원본을 보관하고 가져오지 않았습니다.' : null,
    };
  } catch {
    return { transactions: [], warning: '이전 저축 기록을 읽지 못해 원본을 보관했습니다.' };
  }
}

export function loadFinanceData(): FinanceLoadResult {
  const starter = createStarterData();
  if (typeof window === 'undefined') {
    return { data: starter, warning: null, persistenceBlocked: false };
  }

  let rawFinance: string | null;
  let rawLegacy: string | null;
  try {
    rawFinance = window.localStorage.getItem(FINANCE_STORAGE_KEY);
    rawLegacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return {
      data: starter,
      warning: '이 브라우저 저장 공간에 접근할 수 없어 현재 화면에서만 기록됩니다.',
      persistenceBlocked: true,
    };
  }

  if (rawFinance !== null) {
    try {
      const result = normalizeFinanceData(JSON.parse(rawFinance));
      if (result.data) {
        return {
          data: result.data,
          warning: result.hasInvalidRows
            ? '일부 저장 기록을 안전하게 읽지 못했습니다. 원본 데이터는 변경하지 않습니다.'
            : null,
          persistenceBlocked: result.hasInvalidRows,
        };
      }
    } catch {
      // Keep the original value intact and avoid replacing a store that could not be parsed.
    }
    return {
      data: starter,
      warning: '저장된 데이터를 읽지 못했습니다. 원본을 보관하며 새 변경 사항은 저장하지 않습니다.',
      persistenceBlocked: true,
    };
  }

  const legacy = migrateLegacyContributions(rawLegacy, starter);
  return {
    data: { ...starter, transactions: [...starter.transactions, ...legacy.transactions] },
    warning: legacy.warning,
    persistenceBlocked: false,
  };
}

export function persistFinanceData(data: FinanceData): boolean {
  try {
    window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function createId(prefix: string): string {
  return makeId(prefix);
}

export function formatMoney(amount: number): string {
  return `₩${Math.round(amount).toLocaleString('ko-KR')}`;
}
