import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, CircleHelp, Clock3, Coins, CreditCard, Plus, ShieldCheck, Sparkles, Wallet, X } from 'lucide-react';

const STORAGE_KEY = 'moru-savings-contributions-v1';
const STARTING_BALANCE = 1_420_000;
const STARTING_MONTHLY = 120_000;
const GOAL = 1_970_000;
type Contribution = { id: string; amount: number; date: string };

const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const seedHistory = [760_000, 845_000, 930_000, 1_075_000, 1_210_000, 1_300_000, STARTING_BALANCE];
const seedActivities = [
  { title: '월간 자동 저축', note: '매달 꾸준히 쌓아가는 중', amount: 80_000, monthsAgo: 0, day: 3 },
  { title: '저축 추가', note: '작은 여유를 미래로', amount: 40_000, monthsAgo: 0, day: 12 },
  { title: '월간 자동 저축', note: '지난달의 나에게 고마워요', amount: 80_000, monthsAgo: 1, day: 3 },
];

function money(value: number) {
  return `₩${Math.round(value).toLocaleString('ko-KR')}`;
}
function monthStamp(offset: number) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function loadContributions(): Contribution[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Contribution =>
      !!item && typeof item.id === 'string' && Number.isFinite(item.amount) && item.amount > 0 &&
      typeof item.date === 'string' && !Number.isNaN(new Date(item.date).getTime()),
    );
  } catch {
    return [];
  }
}

function SavingsChart({ points }: { points: number[] }) {
  const width = 720;
  const height = 220;
  const padX = 12;
  const padY = 18;
  const min = Math.floor((Math.min(...points) - 90_000) / 100_000) * 100_000;
  const max = Math.ceil((Math.max(...points) + 80_000) / 100_000) * 100_000;
  const coords = points.map((value, index) => ({
    x: padX + (index * (width - padX * 2)) / (points.length - 1),
    y: height - padY - ((value - min) / (max - min)) * (height - padY * 2),
  }));
  const line = coords.map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;
  const labels = Array.from({ length: 7 }, (_, index) => monthStamp(index - 6).slice(5) + '월');
  return (
    <div className="chart-wrap" data-testid="chart-savings-history">
      <div className="chart-guides" aria-hidden="true">
        {[0, 1, 2].map((lineIndex) => <span key={lineIndex} />)}
      </div>
      <svg className="savings-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="최근 7개월 저축 잔액 추이">
        <defs>
          <linearGradient id="savingsFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#78b488" stopOpacity=".25" />
            <stop offset="100%" stopColor="#78b488" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="chart-area" d={area} fill="url(#savingsFill)" />
        <path className="chart-line" d={line} fill="none" stroke="#83bc91" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r={index === coords.length - 1 ? 5 : 3} fill={index === coords.length - 1 ? '#a1d0ab' : '#659575'} stroke="#19211c" strokeWidth="2" />
            {index === coords.length - 1 && <circle cx={point.x} cy={point.y} r="9" fill="#83bc91" opacity=".13" />}
          </g>
        ))}
      </svg>
      <div className="chart-labels" aria-hidden="true">{labels.map((label, index) => <span key={index}>{label}</span>)}</div>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 67;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="ring-holder" data-testid="goal-progress">
      <svg viewBox="0 0 160 160" className="ring-svg" role="img" aria-label={`저축 목표 ${percent}% 달성`}>
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(183,205,188,.10)" strokeWidth="8" />
        <circle className="progress-ring" cx="80" cy="80" r={radius} fill="none" stroke="#83bc91" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percent / 100)} transform="rotate(-90 80 80)" />
      </svg>
      <div className="ring-copy"><strong data-testid="text-goal-percent">{percent}<small>%</small></strong><span>달성했어요</span></div>
    </div>
  );
}

function AddSavingsDialog({ onClose, onSave }: { onClose: () => void; onSave: (amount: number) => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const amount = Number(input.replaceAll(',', ''));
  const presets = [10_000, 30_000, 50_000, 100_000];
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError('1원 이상의 금액을 입력해 주세요.');
      return;
    }
    if (amount > 100_000_000) {
      setError('한 번에 추가할 수 있는 금액은 1억원 이하예요.');
      return;
    }
    onSave(amount);
  }
  function onDialogKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') onClose();
  }
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={onDialogKey}>
      <section className="dialog panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title" data-testid="dialog-add-savings">
        <div className="dialog-top">
          <div className="dialog-icon"><Coins size={19} /></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="저축 추가 닫기" data-testid="button-close-dialog"><X size={18} /></button>
        </div>
        <p className="eyebrow">A LITTLE CLOSER</p>
        <h2 id="dialog-title">얼마를 모아볼까요?</h2>
        <p className="dialog-description">오늘의 저축을 기록하고, 목표에 한 걸음 더 가까워져요.</p>
        <form onSubmit={submit} noValidate>
          <label className="amount-label" htmlFor="savings-amount">저축 금액</label>
          <div className={`amount-input-wrap ${error ? 'has-error' : ''}`}>
            <span aria-hidden="true">₩</span>
            <input id="savings-amount" autoFocus inputMode="numeric" autoComplete="off" placeholder="0" value={input}
              onChange={(event) => { const digits = event.target.value.replace(/[^\d]/g, '').slice(0, 9); setInput(digits ? Number(digits).toLocaleString('ko-KR') : ''); setError(''); }}
              aria-invalid={!!error} aria-describedby={error ? 'amount-error' : 'amount-hint'} data-testid="input-savings-amount" />
          </div>
          {error ? <p className="form-error" id="amount-error" role="alert">{error}</p> : <p className="input-hint" id="amount-hint">금액은 이 기기에만 저장돼요.</p>}
          <div className="preset-row" aria-label="빠른 금액 선택">
            {presets.map((preset) => <button type="button" key={preset} className="preset-button" onClick={() => { setInput(preset.toLocaleString('ko-KR')); setError(''); }} data-testid={`button-preset-${preset}`}>+{preset / 10000}만원</button>)}
          </div>
          <button className="primary-button dialog-submit" type="submit" data-testid="button-submit-savings"><Plus size={17} /> 저축 기록하기</button>
        </form>
        <div className="privacy-note"><ShieldCheck size={14} /> 계좌 연결 없이, 내 기록만 안전하게</div>
      </section>
    </div>
  );
}

function App() {
  const [contributions, setContributions] = useState<Contribution[]>(loadContributions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contributions));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [contributions]);

  const currentMonthContributions = contributions.filter((entry) => entry.date.slice(0, 7) === currentMonthKey);
  const addedThisMonth = STARTING_MONTHLY + currentMonthContributions.reduce((sum, entry) => sum + entry.amount, 0);
  const balance = STARTING_BALANCE + contributions.reduce((sum, entry) => sum + entry.amount, 0);
  const percent = Math.min(100, Math.round((balance / GOAL) * 100));
  const remaining = Math.max(0, GOAL - balance);
  const chartPoints = useMemo(() => seedHistory.map((point, index) => index === seedHistory.length - 1 ? point + contributions.reduce((sum, item) => sum + item.amount, 0) : point), [contributions]);
  const activities = [
    ...contributions.map((item) => ({ title: '저축 추가', note: '직접 기록한 저축', amount: item.amount, date: new Date(item.date), id: item.id })),
    ...seedActivities.map((item, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - item.monthsAgo);
      date.setDate(Math.min(item.day, new Date().getDate()));
      return { ...item, date, id: `seed-${index}` };
    }),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 4);

  function saveContribution(amount: number) {
    const localNow = new Date();
    const localDate = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}T${String(localNow.getHours()).padStart(2, '0')}:${String(localNow.getMinutes()).padStart(2, '0')}:${String(localNow.getSeconds()).padStart(2, '0')}`;
    const entry: Contribution = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, amount, date: localDate };
    setContributions((current) => [...current, entry]);
    setDialogOpen(false);
  }
  const displayedMonth = new Intl.DateTimeFormat('ko-KR', { month: 'long' }).format(now);

  return (
    <main className="dashboard-shell">
      <div className="dashboard-frame">
        <header className="topbar">
          <a className="brand" href="/" aria-label="모루 저축 홈" data-testid="link-home">
            <span className="brand-mark"><span /></span><span className="brand-name">모루<span className="brand-period">.</span></span>
          </a>
          <div className="topbar-right">
            <div className="quiet-status"><span className="status-dot" /> 조용한 저축 모드</div>
            <button className="help-button" type="button" title="저축 데이터 안내" onClick={() => window.alert('모루의 저축 기록은 이 기기의 브라우저에만 저장됩니다. 계좌 연결이나 금융 정보 가져오기는 하지 않아요.')} data-testid="button-data-info"><CircleHelp size={17} /><span>데이터 안내</span></button>
            <div className="avatar" aria-label="내 저축 공간" data-testid="status-personal-space">M</div>
          </div>
        </header>

        <section className="welcome-row enter">
          <div><p className="eyebrow">YOUR SAVINGS, AT YOUR PACE</p><h1>좋은 밤이에요<span className="title-dot">.</span></h1><p className="welcome-sub">오늘도 차분히, 당신의 속도로 모으고 있어요.</p></div>
          <div className="date-stamp"><span className="date-overline">TODAY</span><span>{new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(now)}</span></div>
        </section>
        {storageWarning && <div className="storage-warning" role="status" data-testid="status-storage-warning">이 브라우저에서는 저장 공간을 사용할 수 없어요. 새 기록은 현재 화면에서만 유지됩니다.</div>}

        <section className="overview-grid enter enter-delay-1" aria-label="저축 요약">
          <article className="panel balance-panel">
            <div className="balance-top"><span className="metric-label"><Wallet size={16} /> 나의 총 저축</span><span className="period-pill"><span /> 전체</span></div>
            <div className="balance-value" data-testid="text-total-savings">{money(balance)}</div>
            <div className="balance-foot"><span className="positive-chip"><ArrowUpRight size={14} /> +{money(addedThisMonth)}</span><span>이번 달 차곡차곡 모았어요</span></div>
            <div className="balance-ornament" aria-hidden="true"><span /><span /><span /><span /><span /></div>
            <button className="primary-button add-button" type="button" onClick={() => setDialogOpen(true)} data-testid="button-add-savings"><Plus size={17} strokeWidth={2.2} /> 저축 추가</button>
          </article>

          <article className="panel goal-panel">
            <div className="section-head"><div><span className="metric-label">이번 목표</span><h2>마음 편한 비상금</h2></div><button className="text-action" type="button" onClick={() => window.alert(`목표 금액은 ${money(GOAL)}이에요.`)} data-testid="button-goal-details">목표 보기 <ChevronDown size={14} /></button></div>
            <div className="goal-content">
              <ProgressRing percent={percent} />
              <div className="goal-numbers"><span className="goal-caption">목표까지 남은 금액</span><strong data-testid="text-goal-remaining">{money(remaining)}</strong><span className="goal-total">목표 {money(GOAL)}</span><div className="mini-progress"><span style={{ width: `${percent}%` }} /></div><span className="goal-footnote">한 걸음씩이면 충분해요</span></div>
            </div>
          </article>
        </section>

        <section className="content-grid enter enter-delay-2">
          <article className="panel chart-panel">
            <div className="section-head chart-heading">
              <div><span className="metric-label">SAVINGS JOURNEY</span><h2>저축 흐름</h2></div>
              <div className="chart-legend"><span className="legend-dot" /> 잔액 <span className="range-select" aria-label="차트 기간: 최근 7개월">최근 7개월 <ChevronDown size={13} /></span></div>
            </div>
            <div className="chart-highlight"><strong>{money(balance)}</strong><span><ArrowUpRight size={14} /> 꾸준히 쌓이는 중</span></div>
            <SavingsChart points={chartPoints} />
            <div className="chart-bottom"><span>지난 7개월 동안의 저축 잔액</span><span className="chart-growth">차분한 성장</span></div>
          </article>

          <article className="panel monthly-panel">
            <div className="section-head"><div><span className="metric-label">{displayedMonth.toUpperCase()} OVERVIEW</span><h2>이번 달 흐름</h2></div><span className="month-tag">{displayedMonth}</span></div>
            <div className="flow-row income-flow"><span className="flow-icon"><ArrowDownLeft size={16} /></span><div className="flow-label"><strong>수입</strong><span>이번 달 들어온 금액</span></div><strong className="flow-amount">{money(3_480_000)}</strong></div>
            <div className="flow-row spending-flow"><span className="flow-icon"><CreditCard size={16} /></span><div className="flow-label"><strong>지출</strong><span>이번 달 사용한 금액</span></div><strong className="flow-amount spending-amount">{money(2_140_000)}</strong></div>
            <div className="flow-bars" aria-label="수입과 지출 비교">
              <div className="flow-bar-line"><span>수입</span><div className="bar-track"><span className="income-bar" /></div><span>100%</span></div>
              <div className="flow-bar-line"><span>지출</span><div className="bar-track"><span className="spending-bar" /></div><span>62%</span></div>
            </div>
            <div className="monthly-note"><span className="note-mark"><Sparkles size={14} /></span><span>수입의 <b>38%</b>를 저축과 여유로 남겼어요.</span></div>
          </article>
        </section>

        <section className="lower-grid enter enter-delay-3">
          <article className="panel categories-panel">
            <div className="section-head"><div><span className="metric-label">SPENDING BREAKDOWN</span><h2>지출 카테고리</h2></div><button type="button" className="text-action" data-testid="button-category-period" onClick={() => window.alert('이번 달 기준으로 표시하고 있어요.')}>이번 달 <ChevronDown size={14} /></button></div>
            <div className="categories-list">
              {[
                { name: '생활 · 식비', detail: '식사와 일상의 소비', amount: 785_000, share: 37, color: 'sage' },
                { name: '주거 · 공과금', detail: '매달 필요한 고정 지출', amount: 640_000, share: 30, color: 'olive' },
                { name: '이동 · 교통', detail: '오가는 길의 비용', amount: 385_000, share: 18, color: 'slate' },
                { name: '취미 · 그 외', detail: '나를 위한 작은 여유', amount: 330_000, share: 15, color: 'sand' },
              ].map((category) => (
                <div className="category-row" key={category.name} data-testid={`row-category-${category.color}`}>
                  <span className={`category-swatch ${category.color}`} />
                  <div className="category-main"><div className="category-name">{category.name}<span>{category.detail}</span></div><div className="category-track"><span className={category.color} style={{ width: `${category.share}%` }} /></div></div>
                  <div className="category-number"><strong>{money(category.amount)}</strong><span>{category.share}%</span></div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel activity-panel">
            <div className="section-head"><div><span className="metric-label">SMALL STEPS ADD UP</span><h2>최근 저축</h2></div><span className="activity-clock"><Clock3 size={15} /> 기록</span></div>
            {activities.length ? <div className="activity-list">
              {activities.map((item) => <div className="activity-row" key={item.id} data-testid={`row-savings-activity-${item.id}`}>
                <span className="activity-icon"><Coins size={16} /></span><div className="activity-copy"><strong>{item.title}</strong><span>{item.note}</span><time>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(item.date)}</time></div><strong className="activity-value">+{money(item.amount)}</strong>
              </div>)}
            </div> : <div className="empty-state"><Coins size={22} /><strong>첫 저축을 기록해 보세요</strong><span>작은 금액도 좋은 시작이에요.</span></div>}
            <button type="button" className="activity-add" onClick={() => setDialogOpen(true)} data-testid="button-add-from-activity"><Plus size={15} /> 저축 기록하기</button>
          </article>
        </section>

        <footer className="footer-note"><span className="footer-mark"><span /></span><span>천천히, 오래 모으는 마음</span><span className="footer-separator">·</span><span>저축 기록은 이 기기에만 저장돼요</span></footer>
      </div>
      {dialogOpen && <AddSavingsDialog onClose={() => setDialogOpen(false)} onSave={saveContribution} />}
    </main>
  );
}

export default App;