import { useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Coins,
  CreditCard,
  Pencil,
  Plus,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  formatMoney,
  type FinanceCategory,
  type FinanceTransaction,
  type SavingsGoal,
  type TransactionKind,
} from '../../lib/finance-data';
import './finance-dashboard.css';

function monthOffsetKey(offset: number, now = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthDate(key: string): Date {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1, 12);
}

function dateLabel(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' })
    .format(new Date(year, month - 1, day, 12));
}

function moneyWithSign(kind: TransactionKind, amount: number): string {
  return `${kind === 'saving' ? '+' : '−'}${formatMoney(amount)}`;
}

function SavingsChart({ transactions }: { transactions: FinanceTransaction[] }) {
  const points = useMemo(() => {
    const months = Array.from({ length: 7 }, (_, index) => monthOffsetKey(index - 6));
    return months.map((key) => ({
      key,
      total: transactions.reduce((sum, transaction) =>
        transaction.kind === 'saving' && transaction.date.slice(0, 7) <= key
          ? sum + transaction.amount
          : sum, 0),
    }));
  }, [transactions]);

  const width = 720;
  const height = 200;
  const padX = 12;
  const padY = 18;
  const values = points.map((point) => point.total);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const spread = Math.max(high - low, 100_000);
  const min = Math.max(0, Math.floor((low - spread * 0.14) / 100_000) * 100_000);
  const max = Math.ceil((high + spread * 0.14) / 100_000) * 100_000 || 100_000;
  const coords = points.map((point, index) => ({
    x: padX + (index * (width - padX * 2)) / Math.max(1, points.length - 1),
    y: height - padY - ((point.total - min) / (max - min || 1)) * (height - padY * 2),
  }));
  const line = coords.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${coords.at(-1)?.x ?? width} ${height} L ${coords[0]?.x ?? 0} ${height} Z`;

  return (
    <div className="finance-chart" data-testid="chart-savings-history">
      <div className="finance-chart__guides" aria-hidden="true"><span /><span /><span /></div>
      <svg className="finance-chart__svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="최근 7개월 저축 누계">
        <defs>
          <linearGradient id="financeSavingsFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#78b488" stopOpacity=".22" />
            <stop offset="100%" stopColor="#78b488" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#financeSavingsFill)" />
        <path d={line} fill="none" stroke="#83bc91" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point, index) => (
          <circle key={points[index].key} cx={point.x} cy={point.y} r={index === coords.length - 1 ? 4.5 : 3} fill={index === coords.length - 1 ? '#a1d0ab' : '#659575'} stroke="#19211c" strokeWidth="2" />
        ))}
      </svg>
      <div className="finance-chart__labels" aria-hidden="true">
        {points.map((point) => <span key={point.key}>{monthDate(point.key).getMonth() + 1}월</span>)}
      </div>
    </div>
  );
}

function GoalProgressRing({ goal, current, index }: { goal: SavingsGoal; current: number; index: number }) {
  const radius = 37;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(100, Math.round((current / goal.targetAmount) * 100));
  const remaining = Math.max(0, goal.targetAmount - current);
  return (
    <div className="finance-goal-card" data-testid={`card-savings-goal-${goal.id}`}>
      <div className="finance-goal-card__ring" data-testid={index === 0 ? 'goal-progress' : `goal-progress-${goal.id}`}>
        <svg viewBox="0 0 92 92" role="progressbar" aria-label={`${goal.name} ${percent}% 달성`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <circle cx="46" cy="46" r={radius} fill="none" stroke="rgba(183,205,188,.10)" strokeWidth="6" />
          <circle
            cx="46"
            cy="46"
            r={radius}
            fill="none"
            stroke="#83bc91"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent / 100)}
            transform="rotate(-90 46 46)"
          />
        </svg>
        <strong data-testid={`text-goal-percent-${goal.id}`}>{percent}<small>%</small></strong>
      </div>
      <div className="finance-goal-card__content">
        <span className="finance-overline">SAVINGS GOAL</span>
        <h3>{goal.name}</h3>
        <div className="finance-goal-card__amount">{formatMoney(current)} <span>모았어요</span></div>
        <div className="finance-goal-card__target">목표 {formatMoney(goal.targetAmount)}</div>
        <div className="finance-goal-card__remaining">
          {remaining > 0 ? `${formatMoney(remaining)} 남았어요` : '목표를 달성했어요'}
        </div>
      </div>
    </div>
  );
}

function CategoryBreakdown({
  kind,
  transactions,
  categories,
  month,
  period,
  onManage,
}: {
  kind: TransactionKind;
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  month: string;
  period: 'all' | 'month';
  onManage: () => void;
}) {
  const items = useMemo(() => {
    const sums = new Map<string, number>();
    transactions.forEach((transaction) => {
      if (transaction.kind === kind && (period === 'all' || transaction.date.slice(0, 7) === month)) {
        sums.set(transaction.categoryId, (sums.get(transaction.categoryId) ?? 0) + transaction.amount);
      }
    });
    return categories
      .filter((category) => category.kind === kind)
      .map((category) => ({ category, amount: sums.get(category.id) ?? 0 }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [categories, kind, month, period, transactions]);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const isSaving = kind === 'saving';
  const title = isSaving ? '저축 범주별 통계' : '이번 달 소비 범주';
  const periodLabel = period === 'all' ? '전체 기록' : new Intl.DateTimeFormat('ko-KR', { month: 'long' }).format(monthDate(month));

  return (
    <article className="panel finance-panel finance-category-panel" data-testid={`panel-${kind}-categories`}>
      <div className="finance-section-heading">
        <div>
          <span className="finance-overline">{isSaving ? 'SAVINGS BREAKDOWN' : 'SPENDING BREAKDOWN'}</span>
          <h2>{title}</h2>
        </div>
        <button type="button" className="finance-text-action" onClick={onManage} data-testid="button-manage-categories">
          범주 관리 <ChevronIcon />
        </button>
      </div>
      {items.length ? (
        <>
          <div className="finance-category-total">
            <span>{periodLabel} 합계</span>
            <strong className={isSaving ? 'is-saving' : 'is-expense'}>{formatMoney(total)}</strong>
          </div>
          <div className="finance-category-list">
            {items.map(({ category, amount }) => {
              const percent = total ? Math.round((amount / total) * 100) : 0;
              return (
                <div className="finance-category-row" key={category.id} data-testid={`row-category-${category.id}`}>
                  <span className="finance-category-row__mark" style={{ backgroundColor: category.color }} aria-hidden="true" />
                  <div className="finance-category-row__main">
                    <div className="finance-category-row__label"><strong>{category.name}</strong><span>{percent}%</span></div>
                    <div className="finance-category-row__track">
                      <span style={{ width: `${percent}%`, backgroundColor: category.color }} />
                    </div>
                  </div>
                  <strong className="finance-category-row__amount">{formatMoney(amount)}</strong>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="finance-view-empty finance-category-empty">
          <span className={`finance-empty-icon ${isSaving ? 'is-saving' : 'is-expense'}`} aria-hidden="true">
            {isSaving ? <Coins size={19} /> : <CreditCard size={19} />}
          </span>
          <strong>{period === 'month' ? '이번 달 거래가 아직 없어요' : '아직 분류된 거래가 없어요'}</strong>
          <span>기록을 추가하면 범주별 합계가 자동으로 계산돼요.</span>
        </div>
      )}
    </article>
  );
}

function ChevronIcon() {
  return <span aria-hidden="true" className="finance-action-arrow">›</span>;
}

function RecentTransactions({
  kind,
  transactions,
  categories,
  goals,
  onEdit,
  onDelete,
}: {
  kind: TransactionKind;
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  goals: SavingsGoal[];
  onEdit: (transaction: FinanceTransaction) => void;
  onDelete: (transaction: FinanceTransaction) => void;
}) {
  const recent = useMemo(() => transactions
    .filter((transaction) => transaction.kind === kind)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 5), [kind, transactions]);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const goalsById = useMemo(() => new Map(goals.map((goal) => [goal.id, goal.name])), [goals]);
  const isSaving = kind === 'saving';

  return (
    <article className="panel finance-panel finance-recent-panel" data-testid={`panel-recent-${kind}`}>
      <div className="finance-section-heading">
        <div>
          <span className="finance-overline">{isSaving ? 'SMALL STEPS ADD UP' : 'RECENT SPENDING'}</span>
          <h2>최근 {isSaving ? '저축' : '소비'} 내역</h2>
        </div>
        <span className="finance-record-count"><Clock3 size={14} /> {recent.length}건</span>
      </div>
      {recent.length ? (
        <div className="finance-recent-list">
          {recent.map((transaction) => (
            <div className={`finance-transaction-row ${isSaving ? 'is-saving' : 'is-expense'}`} key={transaction.id} data-testid={`row-recent-transaction-${transaction.id}`}>
              <span className="finance-transaction-row__icon" aria-hidden="true">
                {isSaving ? <Coins size={16} /> : <CreditCard size={16} />}
              </span>
              <div className="finance-transaction-row__copy">
                <strong>{categoriesById.get(transaction.categoryId) ?? '범주 없음'}</strong>
                <span>{transaction.memo.trim() || (isSaving ? '저축 기록' : '소비 기록')}</span>
                {isSaving && transaction.goalId && goalsById.has(transaction.goalId) && (
                  <span className="finance-transaction-row__goal"><Target size={11} /> {goalsById.get(transaction.goalId)}</span>
                )}
                <time dateTime={transaction.date}><CalendarDays size={11} /> {dateLabel(transaction.date)}</time>
              </div>
              <strong className="finance-transaction-row__amount">{moneyWithSign(kind, transaction.amount)}</strong>
              <div className="finance-transaction-row__actions">
                <button type="button" onClick={() => onEdit(transaction)} aria-label={`${categoriesById.get(transaction.categoryId) ?? '거래'} 수정`} data-testid={`button-edit-transaction-${transaction.id}`}>
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => onDelete(transaction)} aria-label={`${categoriesById.get(transaction.categoryId) ?? '거래'} 삭제`} data-testid={`button-delete-transaction-${transaction.id}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="finance-view-empty finance-recent-empty">
          <span className={`finance-empty-icon ${isSaving ? 'is-saving' : 'is-expense'}`} aria-hidden="true">
            {isSaving ? <Coins size={19} /> : <CreditCard size={19} />}
          </span>
          <strong>아직 내역이 없어요</strong>
          <span>첫 기록을 추가하면 이곳에서 확인할 수 있어요.</span>
        </div>
      )}
    </article>
  );
}

export function SavingsDashboard({
  transactions,
  categories,
  goals,
  currentMonth,
  onAdd,
  onManageCategories,
  onManageGoals,
  onEdit,
  onDelete,
}: {
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  goals: SavingsGoal[];
  currentMonth: string;
  onAdd: () => void;
  onManageCategories: () => void;
  onManageGoals: () => void;
  onEdit: (transaction: FinanceTransaction) => void;
  onDelete: (transaction: FinanceTransaction) => void;
}) {
  const savings = transactions.filter((transaction) => transaction.kind === 'saving');
  const total = savings.reduce((sum, transaction) => sum + transaction.amount, 0);
  const thisMonth = savings
    .filter((transaction) => transaction.date.slice(0, 7) === currentMonth)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const goalAmounts = useMemo(() => {
    const amounts: Record<string, number> = {};
    savings.forEach((transaction) => {
      if (transaction.goalId) amounts[transaction.goalId] = (amounts[transaction.goalId] ?? 0) + transaction.amount;
    });
    return amounts;
  }, [savings]);

  return (
    <div className="finance-view-content" data-testid="view-saving">
      <section className="finance-summary-grid">
        <article className="panel finance-hero-card finance-hero-card--saving">
          <div className="finance-hero-card__top">
            <span className="finance-metric-label"><Wallet size={16} /> 총 저축액</span>
            <span className="finance-period-pill"><span /> 전체 누계</span>
          </div>
          <strong className="finance-hero-card__value" data-testid="text-total-savings">{formatMoney(total)}</strong>
          <div className="finance-hero-card__foot">
            <span className="finance-positive-chip"><ArrowUpRight size={14} /> +{formatMoney(thisMonth)}</span>
            <span>이번 달 저축</span>
          </div>
          <div className="finance-hero-card__ornament" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <button type="button" className="finance-primary-button saving-button finance-hero-card__action" onClick={onAdd} data-testid="button-add-savings">
            <Plus size={16} /> 저축 추가
          </button>
        </article>
        <article className="panel finance-goals-panel">
          <div className="finance-section-heading">
            <div>
              <span className="finance-overline">YOUR GOALS</span>
              <h2>저축 목표</h2>
            </div>
            <button type="button" className="finance-text-action" onClick={onManageGoals} data-testid="button-manage-goals">
              목표 관리 <ChevronIcon />
            </button>
          </div>
          {goals.length ? (
            <div className="finance-goal-list">
              {goals.map((goal, index) => (
                <GoalProgressRing key={goal.id} goal={goal} current={goalAmounts[goal.id] ?? 0} index={index} />
              ))}
            </div>
          ) : (
            <div className="finance-view-empty finance-goal-empty">
              <span className="finance-empty-icon is-saving"><Target size={19} /></span>
              <strong>첫 저축 목표를 만들어 보세요</strong>
              <span>목표에 연결한 저축을 따로 확인할 수 있어요.</span>
              <button type="button" className="finance-secondary-action" onClick={onManageGoals}>목표 추가</button>
            </div>
          )}
        </article>
      </section>

      <section className="finance-two-column">
        <article className="panel finance-panel finance-chart-panel">
          <div className="finance-section-heading finance-section-heading--centered">
            <div>
              <span className="finance-overline">SAVINGS JOURNEY</span>
              <h2>저축 흐름</h2>
            </div>
            <span className="finance-chart-legend"><i /> 누적 저축</span>
          </div>
          <div className="finance-chart-highlight">
            <strong>{formatMoney(total)}</strong>
            <span><ArrowUpRight size={13} /> 지금까지 쌓인 금액</span>
          </div>
          <SavingsChart transactions={transactions} />
          <div className="finance-chart-caption"><span>최근 7개월 동안의 누적 저축</span><span>차분한 성장</span></div>
        </article>
        <CategoryBreakdown
          kind="saving"
          transactions={transactions}
          categories={categories}
          month={currentMonth}
          period="all"
          onManage={onManageCategories}
        />
      </section>

      <RecentTransactions
        kind="saving"
        transactions={transactions}
        categories={categories}
        goals={goals}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

export function ExpenseDashboard({
  transactions,
  categories,
  goals,
  currentMonth,
  onAdd,
  onManageCategories,
  onEdit,
  onDelete,
}: {
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  goals: SavingsGoal[];
  currentMonth: string;
  onAdd: () => void;
  onManageCategories: () => void;
  onEdit: (transaction: FinanceTransaction) => void;
  onDelete: (transaction: FinanceTransaction) => void;
}) {
  const expenses = transactions.filter((transaction) => transaction.kind === 'expense');
  const total = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);
  const thisMonth = expenses
    .filter((transaction) => transaction.date.slice(0, 7) === currentMonth)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const currentMonthLabel = new Intl.DateTimeFormat('ko-KR', { month: 'long' }).format(monthDate(currentMonth));

  return (
    <div className="finance-view-content" data-testid="view-expense">
      <section className="finance-summary-grid finance-summary-grid--expense">
        <article className="panel finance-hero-card finance-hero-card--expense">
          <div className="finance-hero-card__top">
            <span className="finance-metric-label"><CreditCard size={16} /> 총 소비액</span>
            <span className="finance-period-pill finance-period-pill--expense"><span /> 전체 누계</span>
          </div>
          <strong className="finance-hero-card__value finance-hero-card__value--expense" data-testid="text-total-expenses">{formatMoney(total)}</strong>
          <div className="finance-hero-card__foot">
            <span className="finance-expense-chip"><ArrowDownLeft size={14} /> {formatMoney(thisMonth)}</span>
            <span>{currentMonthLabel} 소비</span>
          </div>
          <div className="finance-hero-card__ornament finance-hero-card__ornament--expense" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <button type="button" className="finance-primary-button expense-button finance-hero-card__action" onClick={onAdd} data-testid="button-add-expense">
            <Plus size={16} /> 소비 기록
          </button>
        </article>
        <article className="panel finance-expense-note">
          <div className="finance-expense-note__icon"><CreditCard size={18} /></div>
          <span className="finance-overline">MONTHLY SPENDING</span>
          <h2>{currentMonthLabel} 소비 흐름</h2>
          <strong>{formatMoney(thisMonth)}</strong>
          <p>범주별로 살펴보고, 필요한 소비를 차분히 정리해 보세요.</p>
          <div className="finance-expense-note__detail">
            <span>이번 달 기록</span>
            <b>{expenses.filter((transaction) => transaction.date.slice(0, 7) === currentMonth).length}건</b>
          </div>
        </article>
      </section>

      <section className="finance-two-column">
        <CategoryBreakdown
          kind="expense"
          transactions={transactions}
          categories={categories}
          month={currentMonth}
          period="month"
          onManage={onManageCategories}
        />
        <RecentTransactions
          kind="expense"
          transactions={transactions}
          categories={categories}
          goals={goals}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </section>
      <div className="finance-monthly-hint" data-testid="text-expense-period-hint">
        <CalendarDays size={14} /> 소비 범주별 통계는 {currentMonthLabel} 거래를 기준으로 계산해요.
      </div>
    </div>
  );
}
