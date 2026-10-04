import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CircleHelp,
  CreditCard,
  Wallet,
} from 'lucide-react';
import FinanceCalendar from './components/finance/FinanceCalendar';
import {
  CategoryManagerDialog,
  GoalManagerDialog,
  TransactionDialog,
  type TransactionDraft,
} from './components/finance/FinanceDialogs';
import {
  ExpenseDashboard,
  SavingsDashboard,
} from './components/finance/FinanceDashboardViews';
import './components/finance/finance-navigation.css';
import {
  createId,
  formatMoney,
  loadFinanceData,
  monthKey,
  persistFinanceData,
  todayKey,
  type FinanceCategory,
  type FinanceData,
  type FinanceTransaction,
  type SavingsGoal,
  type TransactionKind,
} from './lib/finance-data';

type DashboardView = 'saving' | 'expense' | 'calendar';
type ManagerDialog = 'categories' | 'goals' | null;

interface TransactionDialogState {
  kind: TransactionKind;
  date?: string;
  transaction?: FinanceTransaction;
}

const NAV_ITEMS: { id: DashboardView; label: string; icon: typeof Wallet }[] = [
  { id: 'saving', label: '저축', icon: Wallet },
  { id: 'expense', label: '소비', icon: CreditCard },
  { id: 'calendar', label: '달력', icon: CalendarDays },
];

const SAVING_CATEGORY_COLORS = ['#84bd90', '#719d7a', '#8eaa80', '#6f9b8c', '#789b87'];
const EXPENSE_CATEGORY_COLORS = ['#b57970', '#aa8173', '#a5797f', '#a28a74', '#9d8174', '#958070', '#85827a'];

function App() {
  const [loadResult] = useState(loadFinanceData);
  const [finance, setFinance] = useState<FinanceData>(loadResult.data);
  const [writeWarning, setWriteWarning] = useState('');
  const [activeView, setActiveView] = useState<DashboardView>('saving');
  const [calendarMonth, setCalendarMonth] = useState(() => monthKey(todayKey()));
  const [transactionDialog, setTransactionDialog] = useState<TransactionDialogState | null>(null);
  const [managerDialog, setManagerDialog] = useState<ManagerDialog>(null);

  const now = new Date();
  const currentMonth = monthKey(now);
  const today = todayKey(now);
  const warning = writeWarning || loadResult.warning;

  useEffect(() => {
    if (loadResult.persistenceBlocked) return;
    if (!persistFinanceData(finance)) {
      setWriteWarning('저장 공간이 부족하거나 제한되어 새 변경 사항을 이 기기에 저장하지 못했습니다.');
    } else {
      setWriteWarning('');
    }
  }, [finance, loadResult]);

  const categoryUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    finance.transactions.forEach((transaction) => {
      counts[transaction.categoryId] = (counts[transaction.categoryId] ?? 0) + 1;
    });
    return counts;
  }, [finance.transactions]);

  const goalAmounts = useMemo(() => {
    const amounts: Record<string, number> = {};
    finance.transactions.forEach((transaction) => {
      if (transaction.kind === 'saving' && transaction.goalId) {
        amounts[transaction.goalId] = (amounts[transaction.goalId] ?? 0) + transaction.amount;
      }
    });
    return amounts;
  }, [finance.transactions]);

  const goalLinkedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    finance.transactions.forEach((transaction) => {
      if (transaction.kind === 'saving' && transaction.goalId) {
        counts[transaction.goalId] = (counts[transaction.goalId] ?? 0) + 1;
      }
    });
    return counts;
  }, [finance.transactions]);

  function openNewTransaction(kind: TransactionKind, date = today) {
    setTransactionDialog({ kind, date });
  }

  function saveTransaction(draft: TransactionDraft, id?: string) {
    setFinance((current) => {
      if (id) {
        return {
          ...current,
          transactions: current.transactions.map((transaction) =>
            transaction.id === id ? { id, ...draft } : transaction),
        };
      }
      return {
        ...current,
        transactions: [...current.transactions, { id: createId('transaction'), ...draft }],
      };
    });
    setTransactionDialog(null);
  }

  function deleteTransaction(transaction: FinanceTransaction) {
    const categoryName = finance.categories.find((category) => category.id === transaction.categoryId)?.name ?? '분류 없음';
    const kindLabel = transaction.kind === 'saving' ? '저축' : '소비';
    const confirmed = window.confirm(
      `${dateForConfirmation(transaction.date)} ${categoryName} ${kindLabel} ${formatMoney(transaction.amount)} 기록을 삭제할까요?`,
    );
    if (!confirmed) return;
    setFinance((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== transaction.id),
    }));
  }

  function addCategory(kind: TransactionKind, name: string) {
    setFinance((current) => {
      const sameKindCount = current.categories.filter((category) => category.kind === kind).length;
      const colors = kind === 'saving' ? SAVING_CATEGORY_COLORS : EXPENSE_CATEGORY_COLORS;
      const category: FinanceCategory = {
        id: createId('category'),
        kind,
        name: name.trim().slice(0, 40),
        color: colors[sameKindCount % colors.length],
        isDefault: false,
      };
      return { ...current, categories: [...current.categories, category] };
    });
  }

  function renameCategory(categoryId: string, name: string) {
    setFinance((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId ? { ...category, name: name.trim().slice(0, 40) } : category),
    }));
  }

  function deleteCategory(category: FinanceCategory, requestedFallbackId: string) {
    const alternatives = finance.categories.filter((item) => item.kind === category.kind && item.id !== category.id);
    if (alternatives.length === 0) {
      window.alert('저축과 소비에 각각 하나 이상의 범주가 필요합니다. 먼저 새 범주를 추가해 주세요.');
      return;
    }
    const fallback = alternatives.find((item) => item.id === requestedFallbackId) ?? alternatives[0];
    const usedCount = categoryUsageCounts[category.id] ?? 0;
    const reassignment = usedCount
      ? ` 연결된 거래 ${usedCount}건은 “${fallback.name}” 범주로 옮겨집니다.`
      : '';
    if (!window.confirm(`“${category.name}” 범주를 삭제할까요?${reassignment}`)) return;
    setFinance((current) => ({
      ...current,
      categories: current.categories.filter((item) => item.id !== category.id),
      transactions: current.transactions.map((transaction) =>
        transaction.categoryId === category.id
          ? { ...transaction, categoryId: fallback.id }
          : transaction),
    }));
  }

  function saveGoal(id: string | undefined, name: string, targetAmount: number) {
    setFinance((current) => {
      if (id) {
        return {
          ...current,
          goals: current.goals.map((goal) =>
            goal.id === id ? { ...goal, name: name.trim().slice(0, 60), targetAmount } : goal),
        };
      }
      const goal: SavingsGoal = { id: createId('goal'), name: name.trim().slice(0, 60), targetAmount };
      return { ...current, goals: [...current.goals, goal] };
    });
  }

  function deleteGoal(goal: SavingsGoal) {
    const linkedCount = goalLinkedCounts[goal.id] ?? 0;
    const reassignment = linkedCount
      ? ` 이 목표에 연결된 저축 거래 ${linkedCount}건은 삭제되지 않고 목표 연결만 해제됩니다.`
      : '';
    if (!window.confirm(`“${goal.name}” 목표를 삭제할까요?${reassignment}`)) return;
    setFinance((current) => ({
      ...current,
      goals: current.goals.filter((item) => item.id !== goal.id),
      transactions: current.transactions.map((transaction) => {
        if (transaction.goalId !== goal.id) return transaction;
        const { goalId: _removedGoalId, ...withoutGoal } = transaction;
        return withoutGoal;
      }),
    }));
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-frame">
        <header className="topbar">
          <a className="brand" href="/" aria-label="모루 저축 홈" data-testid="link-home">
            <span className="brand-mark"><span /></span>
            <span className="brand-name">모루<span className="brand-period">.</span></span>
          </a>
          <div className="topbar-right">
            <div className="quiet-status"><span className="status-dot" /> 조용한 금융 모드</div>
            <button
              className="help-button"
              type="button"
              title="데이터 안내"
              onClick={() => window.alert('모루의 저축과 소비 기록은 이 기기의 브라우저에만 저장됩니다. 계좌 연결이나 금융 정보 가져오기는 하지 않아요.')}
              data-testid="button-data-info"
            >
              <CircleHelp size={17} /><span>데이터 안내</span>
            </button>
            <div className="avatar" aria-label="내 금융 공간" data-testid="status-personal-space">M</div>
          </div>
        </header>

        <section className="welcome-row enter">
          <div>
            <p className="eyebrow">YOUR FINANCE, AT YOUR PACE</p>
            <h1>좋은 밤이에요<span className="title-dot">.</span></h1>
            <p className="welcome-sub">오늘도 차분히, 당신의 속도로 모으고 써요.</p>
          </div>
          <div className="date-stamp">
            <span className="date-overline">TODAY</span>
            <span>{new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(now)}</span>
          </div>
        </section>

        {warning && (
          <div className="storage-warning" role="status" data-testid="status-storage-warning">
            {warning}
          </div>
        )}

        <nav className="dashboard-tabs" aria-label="주요 화면" data-testid="navigation-finance-views">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              data-view={id}
              aria-pressed={activeView === id}
              onClick={() => setActiveView(id)}
              data-testid={`button-tab-${id}`}
            >
              <Icon size={16} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>

        {activeView === 'saving' && (
          <SavingsDashboard
            transactions={finance.transactions}
            categories={finance.categories}
            goals={finance.goals}
            currentMonth={currentMonth}
            onAdd={() => openNewTransaction('saving')}
            onManageCategories={() => setManagerDialog('categories')}
            onManageGoals={() => setManagerDialog('goals')}
            onEdit={(transaction) => setTransactionDialog({ kind: transaction.kind, transaction })}
            onDelete={deleteTransaction}
          />
        )}
        {activeView === 'expense' && (
          <ExpenseDashboard
            transactions={finance.transactions}
            categories={finance.categories}
            goals={finance.goals}
            currentMonth={currentMonth}
            onAdd={() => openNewTransaction('expense')}
            onManageCategories={() => setManagerDialog('categories')}
            onEdit={(transaction) => setTransactionDialog({ kind: transaction.kind, transaction })}
            onDelete={deleteTransaction}
          />
        )}
        {activeView === 'calendar' && (
          <FinanceCalendar
            month={calendarMonth}
            transactions={finance.transactions}
            categories={finance.categories}
            onMonthChange={setCalendarMonth}
            onAdd={(kind, date) => openNewTransaction(kind, date)}
            onEdit={(transaction) => setTransactionDialog({ kind: transaction.kind, transaction })}
            onDelete={deleteTransaction}
          />
        )}

        <footer className="footer-note">
          <span className="footer-mark"><span /></span>
          <span>천천히, 오래 모으는 마음</span>
          <span className="footer-separator">·</span>
          <span>기록은 이 기기에만 저장돼요</span>
        </footer>
      </div>

      {transactionDialog && (
        <TransactionDialog
          key={transactionDialog.transaction?.id ?? `${transactionDialog.kind}-${transactionDialog.date}`}
          categories={finance.categories}
          goals={finance.goals}
          initialKind={transactionDialog.kind}
          initialDate={transactionDialog.date}
          transaction={transactionDialog.transaction}
          onClose={() => setTransactionDialog(null)}
          onSave={saveTransaction}
        />
      )}
      {managerDialog === 'categories' && (
        <CategoryManagerDialog
          categories={finance.categories}
          usageCounts={categoryUsageCounts}
          onClose={() => setManagerDialog(null)}
          onAdd={addCategory}
          onRename={renameCategory}
          onDelete={deleteCategory}
        />
      )}
      {managerDialog === 'goals' && (
        <GoalManagerDialog
          goals={finance.goals}
          currentAmounts={goalAmounts}
          linkedCounts={goalLinkedCounts}
          onClose={() => setManagerDialog(null)}
          onSave={saveGoal}
          onDelete={deleteGoal}
        />
      )}
    </main>
  );
}

function dateForConfirmation(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' })
    .format(new Date(year, month - 1, day, 12));
}

export default App;