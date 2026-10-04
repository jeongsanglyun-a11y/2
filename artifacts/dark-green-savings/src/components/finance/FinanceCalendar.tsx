import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import type { FinanceCategory, FinanceTransaction, TransactionKind } from '../../lib/finance-data';
import './finance-calendar.css';

interface FinanceCalendarProps {
  month: string;
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  onMonthChange: (month: string) => void;
  onAdd: (kind: TransactionKind, date: string) => void;
  onEdit: (transaction: FinanceTransaction) => void;
  onDelete: (transaction: FinanceTransaction) => void;
}

interface DayTotals {
  saving: number;
  expense: number;
  count: number;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const formatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' });
const fullDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});
const exactMoneyFormatter = new Intl.NumberFormat('ko-KR');
const compactMoneyFormatter = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function parseMonth(month: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  }
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  }
  return new Date(year, monthNumber - 1, 1, 12);
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMoney(amount: number): string {
  return `₩${exactMoneyFormatter.format(amount)}`;
}

function formatCompactMoney(amount: number): string {
  return `₩${compactMoneyFormatter.format(amount)}`;
}

function formatMonthLabel(date: Date): string {
  return formatter.format(date);
}

function initialSelectedDate(month: string): string {
  const first = parseMonth(month);
  const now = new Date();
  return first.getFullYear() === now.getFullYear() && first.getMonth() === now.getMonth()
    ? dateKey(now)
    : dateKey(first);
}

export function FinanceCalendar({
  month,
  transactions,
  categories,
  onMonthChange,
  onAdd,
  onEdit,
  onDelete,
}: FinanceCalendarProps) {
  const monthDate = parseMonth(month);
  const monthKey = toMonthKey(monthDate);
  const [selectedDate, setSelectedDate] = useState(() => initialSelectedDate(month));

  useEffect(() => {
    setSelectedDate(initialSelectedDate(month));
  }, [month]);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const monthlyTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.slice(0, 7) === monthKey),
    [transactions, monthKey],
  );

  const dailyTotals = useMemo(() => {
    const totals = new Map<string, DayTotals>();
    for (const transaction of monthlyTransactions) {
      const current = totals.get(transaction.date) ?? { saving: 0, expense: 0, count: 0 };
      current[transaction.kind] += transaction.amount;
      current.count += 1;
      totals.set(transaction.date, current);
    }
    return totals;
  }, [monthlyTransactions]);

  const monthSummary = useMemo(() => monthlyTransactions.reduce(
    (summary, transaction) => {
      summary[transaction.kind] += transaction.amount;
      return summary;
    },
    { saving: 0, expense: 0 },
  ), [monthlyTransactions]);

  const selectedDayTransactions = useMemo(
    () => transactions
      .filter((transaction) => transaction.date === selectedDate)
      .slice()
      .sort((a, b) => a.kind.localeCompare(b.kind) || b.amount - a.amount),
    [transactions, selectedDate],
  );

  const selectedDateObject = parseLocalDate(selectedDate) ?? monthDate;
  const gridStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 - monthDate.getDay(), 12);
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index, 12);
    return { date, key: dateKey(date), inMonth: date.getMonth() === monthDate.getMonth() };
  });

  function changeMonth(offset: number) {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1, 12);
    onMonthChange(toMonthKey(next));
  }

  return (
    <section className="finance-calendar panel" aria-label="월간 가계 달력" data-testid="finance-calendar">
      <div className="finance-calendar__heading">
        <div>
          <span className="finance-calendar__eyebrow">MONTHLY FLOW</span>
          <h2 className="finance-calendar__title">달력</h2>
          <p className="finance-calendar__subtitle">날짜를 눌러 하루의 흐름을 살펴보세요.</p>
        </div>
        <div className="finance-calendar__month-control" aria-label="달력 월 이동">
          <button
            type="button"
            className="finance-calendar__icon-button"
            onClick={() => changeMonth(-1)}
            aria-label="이전 달"
            data-testid="button-calendar-previous-month"
          >
            <ArrowLeft size={17} aria-hidden="true" />
          </button>
          <strong className="finance-calendar__month-label" data-testid="text-calendar-month">
            {formatMonthLabel(monthDate)}
          </strong>
          <button
            type="button"
            className="finance-calendar__icon-button"
            onClick={() => changeMonth(1)}
            aria-label="다음 달"
            data-testid="button-calendar-next-month"
          >
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="finance-calendar__summary" aria-label={`${formatMonthLabel(monthDate)} 요약`}>
        <div className="finance-calendar__summary-item finance-calendar__summary-item--saving" data-testid="summary-calendar-saving">
          <span>저축 · 수입</span>
          <strong>{formatMoney(monthSummary.saving)}</strong>
        </div>
        <div className="finance-calendar__summary-item finance-calendar__summary-item--expense" data-testid="summary-calendar-expense">
          <span>지출</span>
          <strong>{formatMoney(monthSummary.expense)}</strong>
        </div>
        <div className="finance-calendar__summary-item finance-calendar__summary-item--net" data-testid="summary-calendar-net">
          <span>순변화</span>
          <strong className={monthSummary.saving - monthSummary.expense < 0 ? 'is-negative' : ''}>
            {monthSummary.saving - monthSummary.expense > 0 ? '+' : ''}
            {formatMoney(monthSummary.saving - monthSummary.expense)}
          </strong>
        </div>
      </div>

      <div className="finance-calendar__calendar-wrap">
        <div className="finance-calendar__weekdays" aria-hidden="true">
          {WEEKDAYS.map((weekday, index) => (
            <span className={index === 0 ? 'is-sunday' : index === 6 ? 'is-saturday' : ''} key={weekday}>
              {weekday}
            </span>
          ))}
        </div>
        <div className="finance-calendar__grid" role="group" aria-label={`${formatMonthLabel(monthDate)} 날짜`}>
          {calendarDays.map(({ date, key, inMonth }) => {
            const totals = dailyTotals.get(key);
            const isSelected = selectedDate === key;
            const isToday = dateKey(new Date()) === key;
            const dayLabel = fullDateFormatter.format(date);
            return (
              <button
                type="button"
                key={key}
                className={[
                  'finance-calendar__day',
                  !inMonth ? 'is-outside' : '',
                  isSelected ? 'is-selected' : '',
                  isToday ? 'is-today' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setSelectedDate(key)}
                aria-pressed={isSelected}
                aria-label={`${dayLabel}${totals ? `, 저축 ${formatMoney(totals.saving)}, 지출 ${formatMoney(totals.expense)}` : ', 기록 없음'}`}
                data-testid={`button-calendar-day-${key}`}
              >
                <span className="finance-calendar__day-number">{date.getDate()}</span>
                {totals && (
                  <span className="finance-calendar__day-totals" aria-hidden="true">
                    {totals.saving > 0 && <span className="is-saving">+{formatCompactMoney(totals.saving)}</span>}
                    {totals.expense > 0 && <span className="is-expense">−{formatCompactMoney(totals.expense)}</span>}
                  </span>
                )}
                {totals && <span className="finance-calendar__sr-only">{totals.count}건 기록</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="finance-calendar__day-detail">
        <div className="finance-calendar__detail-heading">
          <div className="finance-calendar__detail-date">
            <span className="finance-calendar__date-icon" aria-hidden="true"><CalendarDays size={16} /></span>
            <div>
              <h3 data-testid="text-calendar-selected-date">{fullDateFormatter.format(selectedDateObject)}</h3>
              <p>
                {selectedDayTransactions.length
                  ? `${selectedDayTransactions.length}건의 기록`
                  : '기록을 천천히 채워보세요.'}
              </p>
            </div>
          </div>
          <div className="finance-calendar__add-actions" aria-label={`${selectedDate} 기록 추가`}>
            <button
              type="button"
              className="finance-calendar__add-button"
              onClick={() => onAdd('saving', selectedDate)}
              data-testid="button-calendar-add-saving"
              aria-label={`${selectedDate} 저축 기록 추가`}
            >
              <Plus size={15} aria-hidden="true" />
              <span>저축</span>
            </button>
            <button
              type="button"
              className="finance-calendar__add-button finance-calendar__add-button--expense"
              onClick={() => onAdd('expense', selectedDate)}
              data-testid="button-calendar-add-expense"
              aria-label={`${selectedDate} 지출 기록 추가`}
            >
              <Plus size={15} aria-hidden="true" />
              <span>지출</span>
            </button>
          </div>
        </div>

        {selectedDayTransactions.length > 0 ? (
          <ul className="finance-calendar__transactions" data-testid="list-calendar-day-transactions">
            {selectedDayTransactions.map((transaction) => {
              const category = categoriesById.get(transaction.categoryId);
              const isSaving = transaction.kind === 'saving';
              return (
                <li
                  className={`finance-calendar__transaction ${isSaving ? 'is-saving' : 'is-expense'}`}
                  key={transaction.id}
                  data-testid={`row-calendar-transaction-${transaction.id}`}
                >
                  <span className="finance-calendar__transaction-mark" aria-hidden="true" />
                  <div className="finance-calendar__transaction-copy">
                    <strong>{category?.name ?? '분류 없음'}</strong>
                    <span>{transaction.memo.trim() || (isSaving ? '저축 기록' : '지출 기록')}</span>
                  </div>
                  <strong className="finance-calendar__transaction-amount">
                    {isSaving ? '+' : '−'}{formatMoney(transaction.amount)}
                  </strong>
                  <div className="finance-calendar__transaction-actions">
                    <button
                      type="button"
                      onClick={() => onEdit(transaction)}
                      aria-label={`${category?.name ?? '거래'} 기록 수정`}
                      data-testid={`button-calendar-edit-${transaction.id}`}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(transaction)}
                      aria-label={`${category?.name ?? '거래'} 기록 삭제`}
                      data-testid={`button-calendar-delete-${transaction.id}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="finance-calendar__empty" data-testid="empty-calendar-day">
            <span className="finance-calendar__empty-mark" aria-hidden="true"><CalendarDays size={18} /></span>
            <div>
              <strong>아직 기록이 없어요</strong>
              <p>저축이나 지출을 추가하면 이 날의 흐름이 여기에 보여요.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default FinanceCalendar;