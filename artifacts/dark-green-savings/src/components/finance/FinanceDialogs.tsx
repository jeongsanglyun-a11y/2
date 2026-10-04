import { useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  Coins,
  Pencil,
  Plus,
  RotateCcw,
  Tag,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  formatMoney,
  todayKey,
  type FinanceCategory,
  type FinanceTransaction,
  type SavingsGoal,
  type TransactionKind,
} from '../../lib/finance-data';
import './finance-dialogs.css';

export type TransactionDraft = Omit<FinanceTransaction, 'id'>;

function Overlay({
  title,
  onClose,
  children,
  testId,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId: string;
}) {
  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') onClose();
  }

  return (
    <div
      className="finance-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={handleKey}
    >
      <section
        className="finance-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
      >
        <div className="finance-dialog-header">
          <div className="finance-dialog-heading">
            <span className="finance-dialog-icon" aria-hidden="true">
              <Coins size={18} />
            </span>
            <div>
              <h2>{title}</h2>
              <p>내 기록은 이 기기에만 저장됩니다.</p>
            </div>
          </div>
          <button
            type="button"
            className="finance-icon-button"
            onClick={onClose}
            aria-label="창 닫기"
            data-testid="button-close-finance-dialog"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function parseAmount(value: string): number {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const number = Number(digits);
  return Number.isSafeInteger(number) ? number : 0;
}

const QUICK_AMOUNTS = [1_000, 3_000, 5_000, 10_000, 30_000, 50_000, 100_000];
const MAX_TRANSACTION_AMOUNT = 1_000_000_000_000;

export function TransactionDialog({
  categories,
  goals,
  initialKind,
  initialDate,
  transaction,
  onClose,
  onSave,
}: {
  categories: FinanceCategory[];
  goals: SavingsGoal[];
  initialKind: TransactionKind;
  initialDate?: string;
  transaction?: FinanceTransaction;
  onClose: () => void;
  onSave: (draft: TransactionDraft, id?: string) => void;
}) {
  const initialKindValue = transaction?.kind ?? initialKind;
  const [kind, setKind] = useState<TransactionKind>(initialKindValue);
  const [manualAmount, setManualAmount] = useState(transaction?.amount ?? 0);
  const [quickAdds, setQuickAdds] = useState<number[]>([]);
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '');
  const [date, setDate] = useState(transaction?.date ?? initialDate ?? todayKey());
  const [memo, setMemo] = useState(transaction?.memo ?? '');
  const [goalId, setGoalId] = useState(transaction?.goalId ?? goals[0]?.id ?? '');
  const [error, setError] = useState('');

  const kindCategories = useMemo(
    () => categories.filter((category) => category.kind === kind),
    [categories, kind],
  );
  const amount = manualAmount + quickAdds.reduce((sum, value) => sum + value, 0);
  const resolvedCategoryId = kindCategories.some((category) => category.id === categoryId)
    ? categoryId
    : kindCategories[0]?.id ?? '';

  function changeKind(nextKind: TransactionKind) {
    setKind(nextKind);
    setCategoryId(categories.find((category) => category.kind === nextKind)?.id ?? '');
    setError('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError('1원 이상의 금액을 입력해 주세요.');
      return;
    }
    if (amount > MAX_TRANSACTION_AMOUNT) {
      setError('입력할 수 있는 최대 금액을 초과했습니다.');
      return;
    }
    if (!resolvedCategoryId) {
      setError('먼저 사용할 범주를 추가해 주세요.');
      return;
    }
    if (!date) {
      setError('거래 날짜를 선택해 주세요.');
      return;
    }

    onSave({
      kind,
      amount,
      date,
      categoryId: resolvedCategoryId,
      memo: memo.trim().slice(0, 200),
      ...(kind === 'saving' && goalId ? { goalId } : {}),
    }, transaction?.id);
  }

  const saving = kind === 'saving';
  return (
    <Overlay
      title={transaction ? '거래 수정' : saving ? '저축 기록' : '소비 기록'}
      onClose={onClose}
      testId="dialog-transaction"
    >
      <form className="finance-form" onSubmit={submit} noValidate>
        <div className="finance-kind-switch" role="group" aria-label="거래 종류">
          <button
            type="button"
            className={saving ? 'selected saving-selected' : ''}
            onClick={() => changeKind('saving')}
            aria-pressed={saving}
            data-testid="button-kind-saving"
          >
            저축
          </button>
          <button
            type="button"
            className={!saving ? 'selected expense-selected' : ''}
            onClick={() => changeKind('expense')}
            aria-pressed={!saving}
            data-testid="button-kind-expense"
          >
            소비
          </button>
        </div>

        <label className="finance-field-label" htmlFor="transaction-amount">금액</label>
        <div className={`finance-amount-entry ${saving ? 'is-saving' : 'is-expense'} ${error ? 'has-error' : ''}`}>
          <span aria-hidden="true">₩</span>
          <input
            id="transaction-amount"
            value={manualAmount ? manualAmount.toLocaleString('ko-KR') : ''}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            onChange={(event) => {
              setManualAmount(parseAmount(event.target.value));
              setError('');
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'transaction-error' : 'transaction-amount-preview'}
            data-testid="input-transaction-amount"
          />
        </div>
        {!transaction && (
          <>
            <div className="amount-preview" id="transaction-amount-preview">
              <span>현재 입력 금액</span>
              <strong className={saving ? 'amount-saving' : 'amount-expense'}>
                {saving ? '+' : '−'}{formatMoney(amount)}
              </strong>
            </div>
            <div className="quick-amounts" aria-label="빠른 금액 누적 추가">
              {QUICK_AMOUNTS.map((quickAmount) => (
                <button
                  type="button"
                  key={quickAmount}
                  onClick={() => {
                    setQuickAdds((current) => [...current, quickAmount]);
                    setError('');
                  }}
                  data-testid={`button-quick-add-${quickAmount}`}
                >
                  +{quickAmount.toLocaleString('ko-KR')}
                </button>
              ))}
            </div>
            <div className="quick-edit-actions">
              <button
                type="button"
                onClick={() => setQuickAdds((current) => current.slice(0, -1))}
                disabled={quickAdds.length === 0}
                data-testid="button-undo-quick-amount"
              >
                <RotateCcw size={14} /> 취소/되돌리기
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualAmount(0);
                  setQuickAdds([]);
                  setError('');
                }}
                disabled={manualAmount === 0 && quickAdds.length === 0}
                data-testid="button-clear-amount"
              >
                초기화
              </button>
            </div>
          </>
        )}
        {error && <p className="finance-form-error" id="transaction-error" role="alert">{error}</p>}

        <div className="finance-form-grid">
          <div className="finance-field">
            <label className="finance-field-label" htmlFor="transaction-category">범주</label>
            <div className="finance-select-wrap">
              <select
                id="transaction-category"
                value={resolvedCategoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
                data-testid="select-transaction-category"
              >
                {kindCategories.length === 0 && <option value="">범주 없음</option>}
                {kindCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </div>
          </div>
          <div className="finance-field">
            <label className="finance-field-label" htmlFor="transaction-date">날짜</label>
            <input
              id="transaction-date"
              className="finance-text-input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              data-testid="input-transaction-date"
            />
          </div>
          {saving && (
            <div className="finance-field finance-full-field">
              <label className="finance-field-label" htmlFor="transaction-goal">연결할 저축 목표 <span>선택</span></label>
              <div className="finance-select-wrap">
                <select
                  id="transaction-goal"
                  value={goalId}
                  onChange={(event) => setGoalId(event.target.value)}
                  data-testid="select-transaction-goal"
                >
                  <option value="">연결하지 않음</option>
                  {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </div>
            </div>
          )}
          <div className="finance-field finance-full-field">
            <label className="finance-field-label" htmlFor="transaction-memo">메모 <span>선택</span></label>
            <input
              id="transaction-memo"
              className="finance-text-input"
              value={memo}
              maxLength={200}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="거래 내용을 간단히 적어 주세요"
              data-testid="input-transaction-memo"
            />
          </div>
        </div>
        <div className="finance-form-actions">
          <button type="button" className="finance-secondary-button" onClick={onClose} data-testid="button-cancel-transaction">
            취소
          </button>
          <button type="submit" className={`finance-primary-button ${saving ? 'saving-button' : 'expense-button'}`} data-testid="button-save-transaction">
            <Plus size={16} /> {transaction ? '변경 저장' : saving ? '저축 추가' : '소비 기록'}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

export function CategoryManagerDialog({
  categories,
  usageCounts,
  onClose,
  onAdd,
  onRename,
  onDelete,
}: {
  categories: FinanceCategory[];
  usageCounts: Record<string, number>;
  onClose: () => void;
  onAdd: (kind: TransactionKind, name: string) => void;
  onRename: (categoryId: string, name: string) => void;
  onDelete: (category: FinanceCategory, fallbackId: string) => void;
}) {
  const [kind, setKind] = useState<TransactionKind>('saving');
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [fallbackById, setFallbackById] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const visibleCategories = categories.filter((category) => category.kind === kind);

  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('범주 이름을 입력해 주세요.');
      return;
    }
    if (categories.some((category) => category.kind === kind && category.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
      setError('이미 같은 이름의 범주가 있어요.');
      return;
    }
    onAdd(kind, trimmed);
    setName('');
    setError('');
  }

  function saveRename(category: FinanceCategory) {
    const trimmed = editName.trim();
    if (!trimmed) {
      setError('범주 이름을 입력해 주세요.');
      return;
    }
    if (categories.some((other) => other.id !== category.id && other.kind === kind &&
        other.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
      setError('이미 같은 이름의 범주가 있어요.');
      return;
    }
    onRename(category.id, trimmed);
    setEditId(null);
    setEditName('');
    setError('');
  }

  function fallbackFor(category: FinanceCategory) {
    const alternatives = categories.filter((item) => item.kind === category.kind && item.id !== category.id);
    return fallbackById[category.id] ?? alternatives.find((item) => item.id.endsWith('-other'))?.id ?? alternatives[0]?.id ?? '';
  }

  return (
    <Overlay title="범주 관리" onClose={onClose} testId="dialog-category-manager">
      <div className="manager-tabs" role="group" aria-label="관리할 범주 종류">
        <button type="button" className={kind === 'saving' ? 'selected saving-selected' : ''} onClick={() => { setKind('saving'); setError(''); setEditId(null); }} aria-pressed={kind === 'saving'} data-testid="tab-saving-categories">
          저축 범주
        </button>
        <button type="button" className={kind === 'expense' ? 'selected expense-selected' : ''} onClick={() => { setKind('expense'); setError(''); setEditId(null); }} aria-pressed={kind === 'expense'} data-testid="tab-expense-categories">
          소비 범주
        </button>
      </div>
      <form className="category-add-form" onSubmit={addCategory}>
        <label className="finance-field-label" htmlFor="new-category-name">새 범주 이름</label>
        <div className="category-add-row">
          <input
            id="new-category-name"
            className="finance-text-input"
            value={name}
            maxLength={40}
            onChange={(event) => { setName(event.target.value); setError(''); }}
            placeholder={kind === 'saving' ? '예: 부모님 지원' : '예: 카페'}
            data-testid="input-new-category"
          />
          <button type="submit" className="finance-primary-button saving-button" data-testid="button-add-category">
            <Plus size={15} /> 추가
          </button>
        </div>
      </form>
      {error && <p className="finance-form-error" role="alert">{error}</p>}
      <div className="manager-list" data-testid="list-categories">
        {visibleCategories.map((category) => {
          const alternatives = visibleCategories.filter((item) => item.id !== category.id);
          const editing = editId === category.id;
          return (
            <div className="manager-row category-manager-row" key={category.id} data-testid={`row-category-manager-${category.id}`}>
              <span className="manager-color-dot" style={{ backgroundColor: category.color }} aria-hidden="true" />
              {editing ? (
                <div className="manager-edit-line">
                  <input
                    className="finance-text-input"
                    value={editName}
                    maxLength={40}
                    onChange={(event) => { setEditName(event.target.value); setError(''); }}
                    aria-label={`${category.name} 범주 이름`}
                    data-testid={`input-edit-category-${category.id}`}
                  />
                  <button type="button" className="manager-icon-action" onClick={() => saveRename(category)} aria-label="이름 저장" data-testid={`button-save-category-${category.id}`}>
                    <Check size={16} />
                  </button>
                  <button type="button" className="manager-icon-action" onClick={() => { setEditId(null); setError(''); }} aria-label="이름 수정 취소">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="manager-row-copy">
                    <strong>{category.name}</strong>
                    <span>{usageCounts[category.id] ?? 0}건의 거래에 사용</span>
                  </div>
                  <button
                    type="button"
                    className="manager-icon-action"
                    onClick={() => { setEditId(category.id); setEditName(category.name); setError(''); }}
                    aria-label={`${category.name} 이름 수정`}
                    data-testid={`button-edit-category-${category.id}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="manager-icon-action danger-action"
                    onClick={() => onDelete(category, fallbackFor(category))}
                    disabled={alternatives.length === 0}
                    aria-label={`${category.name} 범주 삭제`}
                    data-testid={`button-delete-category-${category.id}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="manager-footnote">
        <Tag size={13} /> 사용 중인 범주를 삭제하면 연결된 거래는 다른 범주로 옮겨집니다.
      </p>
    </Overlay>
  );
}

export function GoalManagerDialog({
  goals,
  currentAmounts,
  linkedCounts,
  onClose,
  onSave,
  onDelete,
}: {
  goals: SavingsGoal[];
  currentAmounts: Record<string, number>;
  linkedCounts: Record<string, number>;
  onClose: () => void;
  onSave: (id: string | undefined, name: string, targetAmount: number) => void;
  onDelete: (goal: SavingsGoal) => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [error, setError] = useState('');
  const editingGoal = goals.find((goal) => goal.id === editId);

  function beginEdit(goal?: SavingsGoal) {
    setEditId(goal?.id ?? '');
    setName(goal?.name ?? '');
    setTargetAmount(goal ? goal.targetAmount.toLocaleString('ko-KR') : '');
    setError('');
  }

  function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const target = parseAmount(targetAmount);
    if (!trimmedName) {
      setError('목표 이름을 입력해 주세요.');
      return;
    }
    if (!Number.isSafeInteger(target) || target <= 0) {
      setError('1원 이상의 목표 금액을 입력해 주세요.');
      return;
    }
    if (target > MAX_TRANSACTION_AMOUNT) {
      setError('입력할 수 있는 최대 금액을 초과했습니다.');
      return;
    }
    onSave(editId || undefined, trimmedName, target);
    setEditId(null);
    setName('');
    setTargetAmount('');
    setError('');
  }

  return (
    <Overlay title="저축 목표 관리" onClose={onClose} testId="dialog-goal-manager">
      <div className="goal-manager-intro">
        <Target size={16} /> 목표별 저축액은 연결된 저축 거래에서 계산됩니다.
      </div>
      <button type="button" className="finance-primary-button saving-button goal-new-button" onClick={() => beginEdit()} data-testid="button-new-goal">
        <Plus size={16} /> 새 목표 추가
      </button>
      {editId !== null && (
        <form className="goal-edit-form" onSubmit={saveGoal}>
          <div className="finance-field">
            <label className="finance-field-label" htmlFor="goal-name">{editingGoal ? '목표 이름 수정' : '새 목표 이름'}</label>
            <input
              id="goal-name"
              className="finance-text-input"
              value={name}
              maxLength={60}
              onChange={(event) => { setName(event.target.value); setError(''); }}
              placeholder="예: 여행 자금"
              data-testid="input-goal-name"
            />
          </div>
          <div className="finance-field">
            <label className="finance-field-label" htmlFor="goal-target">목표 금액</label>
            <input
              id="goal-target"
              className="finance-text-input"
              inputMode="numeric"
              value={targetAmount}
              onChange={(event) => { setTargetAmount(event.target.value.replace(/[^\d]/g, '').slice(0, 13) ? Number(event.target.value.replace(/[^\d]/g, '').slice(0, 13)).toLocaleString('ko-KR') : ''); setError(''); }}
              placeholder="₩0"
              data-testid="input-goal-target"
            />
          </div>
          {error && <p className="finance-form-error" role="alert">{error}</p>}
          <div className="finance-form-actions">
            <button type="button" className="finance-secondary-button" onClick={() => { setEditId(null); setError(''); }} data-testid="button-cancel-goal">
              취소
            </button>
            <button type="submit" className="finance-primary-button saving-button" data-testid="button-save-goal">
              <Check size={15} /> 저장
            </button>
          </div>
        </form>
      )}
      <div className="manager-list goal-manager-list" data-testid="list-goals">
        {goals.length === 0 && <div className="manager-empty">아직 목표가 없어요. 새 목표를 만들어 보세요.</div>}
        {goals.map((goal) => {
          const current = currentAmounts[goal.id] ?? 0;
          const percent = Math.min(100, Math.round((current / goal.targetAmount) * 100));
          return (
            <div className="goal-manager-card" key={goal.id} data-testid={`card-goal-manager-${goal.id}`}>
              <div className="goal-manager-top">
                <div className="manager-row-copy">
                  <strong>{goal.name}</strong>
                  <span>{linkedCounts[goal.id] ?? 0}건의 저축 거래 연결</span>
                </div>
                <div className="goal-manager-actions">
                  <button type="button" className="manager-icon-action" onClick={() => beginEdit(goal)} aria-label={`${goal.name} 목표 수정`} data-testid={`button-edit-goal-${goal.id}`}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="manager-icon-action danger-action" onClick={() => onDelete(goal)} aria-label={`${goal.name} 목표 삭제`} data-testid={`button-delete-goal-${goal.id}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="goal-manager-values">
                <span>{formatMoney(current)} <small>모음</small></span>
                <span>{formatMoney(goal.targetAmount)} <small>목표</small></span>
              </div>
              <div className="goal-manager-track" role="progressbar" aria-label={`${goal.name} 달성률`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                <span style={{ width: `${percent}%` }} />
              </div>
              <span className="goal-manager-percent">{percent}% 달성</span>
            </div>
          );
        })}
      </div>
      <p className="manager-footnote"><Target size={13} /> 목표를 삭제해도 거래 기록은 남고, 목표 연결만 해제됩니다.</p>
    </Overlay>
  );
}
