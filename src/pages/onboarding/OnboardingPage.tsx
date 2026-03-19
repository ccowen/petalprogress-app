import { useState, useCallback, useMemo } from 'react';
import styles from './OnboardingPage.module.css';

/* ── Constants ── */

const TOTAL_VISUAL_STEPS = 4; // number of dots

const CHIP_DESC: Record<number, string> = {
  1: 'Set a clear time and place for your habit so it becomes part of your routine.',
  2: 'Start small \u2014 a habit you do reliably beats one you plan for but skip.',
  3: 'Connect your habit to something you enjoy. The more appealing it feels, the more you\u2019ll want to return.',
  4: 'Celebrate each check-in. That feeling of progress is what keeps you coming back.',
};

const TF_OPTIONS = [
  { key: 'weekly', label: 'Weekly', range: '7 days' },
  { key: 'monthly', label: 'Monthly', range: '4 weeks \u00B7 ~30 days' },
  { key: 'quarterly', label: 'Quarterly', range: '3 months \u00B7 13 weeks' },
  { key: 'yearly', label: 'Yearly', range: '12 months \u00B7 52 weeks' },
  { key: 'custom', label: 'Custom', range: 'You choose the dates' },
] as const;

const TF_LABELS: Record<string, string> = {
  yearly: 'Yearly mandala',
  quarterly: 'Quarterly mandala',
  monthly: 'Monthly mandala',
  weekly: 'Weekly mandala',
  custom: 'Custom mandala',
};

const FREQ_NOTES: Record<number, string> = {
  1: 'A single commitment. Small and sturdy.',
  2: 'Gentle and sustainable.',
  3: 'A gentle start. Consistency matters more than intensity.',
  4: 'A solid rhythm \u2014 four days leaves room for life.',
  5: 'Five days is strong. Leave yourself a rest day.',
  6: 'Ambitious. Make sure each session is short enough to sustain.',
  7: 'Every day. Consider making each session very brief.',
};

/* Step IDs used in the wireframe: 0, 2, 3, 4, 6 */
type StepId = 0 | 2 | 3 | 4 | 6;

/* ── Mandala SVG helpers ── */

function makePetal(
  x: number,
  y: number,
  rx: number,
  ry: number,
  angle: number,
  color: string,
  opacity: number,
) {
  return (
    <ellipse
      key={`${x.toFixed(1)}-${y.toFixed(1)}-${angle.toFixed(1)}`}
      cx={x.toFixed(1)}
      cy={y.toFixed(1)}
      rx={rx}
      ry={ry}
      fill={color}
      opacity={opacity}
      transform={`rotate(${angle.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`}
    />
  );
}

function buildRing(
  n: number,
  r: number,
  rx: number,
  ry: number,
  filledN: number | undefined,
  cx: number,
  cy: number,
  petalColor: string,
) {
  const petals = [];
  for (let i = 0; i < n; i++) {
    const angle = i * (360 / n);
    const a = (angle * Math.PI) / 180;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const filled = filledN === undefined || i < filledN;
    petals.push(
      makePetal(x, y, rx, ry, angle, filled ? petalColor : '#EDE9E3', filled ? 0.9 : 0.5),
    );
  }
  return petals;
}

/* ── Component ── */

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<StepId>(0);
  const [habitName, setHabitName] = useState('');
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [selectedTF, setSelectedTF] = useState('weekly');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [goalN, setGoalN] = useState(3);

  /* Hint toggles */
  const [habitHintOpen, setHabitHintOpen] = useState(false);
  const [goalHintOpen, setGoalHintOpen] = useState(false);

  /* Tip card dismissals */
  const [tipStep3Visible, setTipStep3Visible] = useState(true);
  const [tipStep4Visible, setTipStep4Visible] = useState(true);

  const petalColor = '#7B9BAF';

  /* ── Step navigation ── */
  const goStep = useCallback((n: StepId) => {
    setCurrentStep(n);
  }, []);

  /* ── Step dots ── */
  const stepDots = useMemo(() => {
    // Map stepId to visual index: 0->0, 2->1, 3->2, 4->3, 6->4 (but only 4 dots for steps 2-6)
    const cur = currentStep <= 0 ? 0 : currentStep === 2 ? 1 : currentStep === 3 ? 2 : currentStep === 4 ? 3 : 4;
    return Array.from({ length: TOTAL_VISUAL_STEPS }, (_, i) => {
      if (i < cur)
        return <div key={i} className={styles.sdotDone} />;
      if (i === cur)
        return <div key={i} className={styles.sdotActive} />;
      return <div key={i} className={styles.sdotFuture} />;
    });
  }, [currentStep]);

  /* ── Chip selection ── */
  const handleChipClick = useCallback(
    (n: number) => {
      setSelectedChip(selectedChip === n ? null : n);
    },
    [selectedChip],
  );

  /* ── Timeframe ── */
  const handleTFSelect = useCallback((key: string) => {
    setSelectedTF(key);
  }, []);

  /* ── Goal stepper ── */
  const stepGoal = useCallback(
    (d: number) => {
      setGoalN((prev) => Math.min(7, Math.max(1, prev + d)));
    },
    [],
  );

  /* ── Preview meta ── */
  const previewTimeframe = TF_LABELS[selectedTF] || 'Weekly mandala';
  const previewStartLabel = useMemo(() => {
    if (!startDate) return 'Set a start date';
    const d = new Date(startDate + 'T00:00:00');
    let str = 'Starts ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (selectedTF === 'custom' && endDate) {
      const d2 = new Date(endDate + 'T00:00:00');
      str += ' \u2192 ' + d2.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return str;
  }, [startDate, endDate, selectedTF]);

  /* ── Mandala rings ── */
  const mandalaRings = useMemo(() => {
    const cx = 160;
    const cy = 160;
    const s = currentStep;
    const rings: React.ReactElement[] = [];

    if (s >= 2) rings.push(...buildRing(8, 40, 5, 12, undefined, cx, cy, petalColor));
    if (s >= 4) rings.push(...buildRing(12, 66, 5.5, 13, Math.round((goalN / 7) * 12), cx, cy, petalColor));
    if (s >= 6) {
      rings.push(...buildRing(16, 94, 6, 14, 6, cx, cy, petalColor));
      rings.push(...buildRing(20, 122, 5, 13, 0, cx, cy, petalColor));
    }
    return rings;
  }, [currentStep, goalN, petalColor]);

  const mandalaMsg = useMemo(() => {
    if (currentStep >= 6) return 'Check in tomorrow to bloom your first petal.';
    return '';
  }, [currentStep]);

  /* ── Finish ── */
  const finish = useCallback(() => {
    // In production, navigate to mandala view
    window.location.href = '/mandala';
  }, []);

  return (
    <div className={styles.wrapper}>
      {/* ── LEFT PANEL ── */}
      <div className={styles.leftPanel}>
        <div className={styles.stepDots}>{stepDots}</div>

        {/* STEP 0: Welcome */}
        <div className={currentStep === 0 ? styles.stepShow : styles.step}>
          <div className={styles.stepEyebrow}>Welcome</div>
          <div className={styles.stepTitle}>
            Let&rsquo;s build something <em>lasting.</em>
          </div>
          <div className={styles.stepDesc}>
            PetalProgress isn&rsquo;t about hitting targets. It&rsquo;s about falling in love with
            the process of showing up &mdash; and watching that process bloom over time.
          </div>
          <div className={styles.stepDescNoMargin}>
            We&rsquo;ll help you set up a habit, give it a home in your mandala, and build a rhythm
            that actually sticks. It takes about 3 minutes.
          </div>
          <div className={styles.stepNav}>
            <button className={styles.btnNext} onClick={() => goStep(2)}>
              Get started &rarr;
            </button>
          </div>
        </div>

        {/* STEP 2: Define Habit */}
        <div className={currentStep === 2 ? styles.stepShow : styles.step}>
          <div className={styles.stepEyebrow}>Step 1 of 4 &middot; Your Habit</div>
          <div className={styles.stepTitle}>
            What will you <em>practice?</em>
          </div>
          <div className={styles.stepDesc}>
            Name your habit. The clearer the description, the easier it is to follow through.
          </div>

          <div className={styles.lawsMini}>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                className={selectedChip === n ? styles.lawMiniPillLit : styles.lawMiniPill}
                onClick={() => handleChipClick(n)}
              >
                {'\u2460\u2461\u2462\u2463'[n - 1]}{' '}
                {['Obvious', 'Easy', 'Attractive', 'Satisfying'][n - 1]}
              </button>
            ))}
          </div>

          {selectedChip !== null && (
            <div className={styles.chipDesc}>{CHIP_DESC[selectedChip]}</div>
          )}

          <input
            className={styles.field}
            type="text"
            placeholder="e.g. Morning Walk"
            value={habitName}
            onChange={(e) => setHabitName(e.target.value)}
          />

          <button
            className={styles.hintToggle}
            onClick={() => setHabitHintOpen(!habitHintOpen)}
          >
            <span className={habitHintOpen ? styles.hintToggleIconOpen : styles.hintToggleIcon}>
              &#9654;
            </span>{' '}
            What makes a good habit name?
          </button>

          {habitHintOpen && (
            <div className={styles.hintBody}>
              <p>
                A habit name that includes a little context &mdash; like a time of day or a place
                &mdash; can make it much easier to follow through. Even something simple like
                &ldquo;after breakfast&rdquo; or &ldquo;before bed&rdquo; gives your brain a
                friendly nudge.
              </p>
              <p>
                That said, there&rsquo;s no wrong way to name it. Start wherever feels natural to
                you.
              </p>
            </div>
          )}

          <div className={styles.stepNav}>
            <button className={styles.btnBack} onClick={() => goStep(0)}>
              Back
            </button>
            <button className={styles.btnNext} onClick={() => goStep(3)}>
              Continue &rarr;
            </button>
          </div>
        </div>

        {/* STEP 3: Timeframe */}
        <div className={currentStep === 3 ? styles.stepShow : styles.step}>
          <div className={styles.stepEyebrow}>Step 2 of 4 &middot; Your Timeframe</div>
          <div className={styles.stepTitle}>
            Start <em>smaller</em> than you think.
          </div>
          <div className={styles.stepDesc}>
            A shorter mandala is easier to complete &mdash; and completing one feels great. You can
            always start another once it&rsquo;s done.
          </div>

          <div className={styles.timeframeOptions}>
            {TF_OPTIONS.map((opt) => (
              <div
                key={opt.key}
                className={selectedTF === opt.key ? styles.tfOptionOn : styles.tfOption}
                onClick={() => handleTFSelect(opt.key)}
              >
                <div className={styles.tfRadio}>
                  {selectedTF === opt.key && <div className={styles.tfRadioInner} />}
                </div>
                <div className={styles.tfLabel}>{opt.label}</div>
                <div className={styles.tfRange}>{opt.range}</div>
              </div>
            ))}
          </div>

          {tipStep3Visible && (
            <div className={styles.tipCard}>
              <div className={styles.tipCardInner}>
                <div className={styles.tipIcon}>{'\uD83D\uDCA1'}</div>
                <div className={styles.tipText}>
                  Once a mandala is <strong>complete</strong>, it leaves your active count &mdash; so
                  on the free plan you can always start a fresh one. Completing mandalas doesn&rsquo;t
                  use up your free habits.
                </div>
              </div>
              <button className={styles.tipDismiss} onClick={() => setTipStep3Visible(false)}>
                &times;
              </button>
            </div>
          )}

          <div className={styles.dateRow}>
            <div className={styles.dateFieldWrap}>
              <div className={styles.dateLabel}>Start date</div>
              <input
                className={styles.fieldDate}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {selectedTF === 'custom' && (
              <div className={styles.dateFieldWrap}>
                <div className={styles.dateLabel}>End date</div>
                <input
                  className={styles.fieldDate}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className={styles.stepNav}>
            <button className={styles.btnBack} onClick={() => goStep(2)}>
              Back
            </button>
            <button className={styles.btnNext} onClick={() => goStep(4)}>
              Continue &rarr;
            </button>
          </div>
        </div>

        {/* STEP 4: Weekly target */}
        <div className={currentStep === 4 ? styles.stepShow : styles.step}>
          <div className={styles.stepEyebrow}>Step 3 of 4 &middot; Your Rhythm</div>
          <div className={styles.stepTitle}>
            How often <em>feels right?</em>
          </div>
          <div className={styles.stepDesc}>
            Set a weekly target that feels achievable &mdash; not aspirational. You can always adjust
            it later.
          </div>

          <div className={styles.lawEasy}>{'\u2461'} Make it Easy</div>

          <div className={styles.stepper}>
            <button className={styles.stepBtn} onClick={() => stepGoal(-1)}>
              &minus;
            </button>
            <div className={styles.stepNumWrap}>
              <div className={styles.stepNum}>{goalN}</div>
              <div className={styles.stepUnit}>&times; per week</div>
            </div>
            <button className={styles.stepBtn} onClick={() => stepGoal(1)}>
              +
            </button>
          </div>

          <div className={styles.freqNote}>{FREQ_NOTES[goalN]}</div>

          {tipStep4Visible && (
            <div className={styles.tipCard}>
              <div className={styles.tipCardInner}>
                <div className={styles.tipIcon}>{'\uD83C\uDF31'}</div>
                <div className={styles.tipText}>
                  <strong>Start smaller than you think.</strong> A weekly target you hit reliably
                  beats an ambitious one you skip. You can always raise it once the habit sticks.
                </div>
              </div>
              <button className={styles.tipDismiss} onClick={() => setTipStep4Visible(false)}>
                &times;
              </button>
            </div>
          )}

          <button
            className={styles.hintToggle}
            onClick={() => setGoalHintOpen(!goalHintOpen)}
          >
            <span className={goalHintOpen ? styles.hintToggleIconOpen : styles.hintToggleIcon}>
              &#9654;
            </span>{' '}
            The two-minute rule
          </button>

          {goalHintOpen && (
            <div className={styles.hintBody}>
              <p>
                When starting a new habit, scale it down until it takes two minutes or less.
                &ldquo;Read every night&rdquo; becomes &ldquo;Read one page.&rdquo; &ldquo;Run 5
                miles&rdquo; becomes &ldquo;Put on running shoes.&rdquo;
              </p>
              <p>
                The point isn&rsquo;t the two minutes &mdash; it&rsquo;s showing up. Once
                you&rsquo;re there, you&rsquo;ll usually keep going.
              </p>
            </div>
          )}

          <div className={styles.stepNav}>
            <button className={styles.btnBack} onClick={() => goStep(3)}>
              Back
            </button>
            <button className={styles.btnNext} onClick={() => goStep(6)}>
              Continue &rarr;
            </button>
          </div>
        </div>

        {/* STEP 6: Reveal */}
        <div className={currentStep === 6 ? styles.stepShow : styles.step}>
          <div className={styles.stepEyebrow}>You&rsquo;re all set</div>
          <div className={styles.stepTitle}>
            <em>Congratulations</em> &mdash; your mandala is ready.
          </div>
          <div className={styles.stepDesc}>
            Every time you check in, your mandala grows richer. The pattern that emerges over time is
            yours alone &mdash; a record of every day you showed up.
          </div>
          <div className={styles.stepNav}>
            <button className={styles.btnBack} onClick={() => goStep(4)}>
              Back
            </button>
            <button className={styles.btnNextSage} onClick={finish}>
              Open my mandala &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className={styles.rightPanel}>
        <div className={styles.previewLabel}>Preview</div>
        <div className={styles.mandalaPreview}>
          <div className={styles.previewHeader}>
            <div className={styles.previewHabitName}>
              {habitName || 'My practice'}
            </div>
          </div>

          <svg
            width="300"
            height="300"
            viewBox="0 0 320 320"
            style={{
              filter: 'drop-shadow(0 16px 48px rgba(0,0,0,0.07))',
              transition: 'all 0.5s',
            }}
          >
            <circle cx="160" cy="160" r="154" fill="#FDFCFA" stroke="#EDE9E3" strokeWidth="1" />
            <circle
              cx="160"
              cy="160"
              r="142"
              stroke="#D4CEC7"
              strokeWidth="0.5"
              strokeDasharray="3 4"
              opacity="0.4"
              fill="none"
            />
            {mandalaRings}
            <circle cx="160" cy="160" r="26" fill="none" stroke="#EDE9E3" strokeWidth="1.5" />
            <circle cx="160" cy="160" r="18" fill="#F8F6F3" stroke="#D4CEC7" strokeWidth="1" />
            <text x="160" y="167" textAnchor="middle" fontSize="18">
              {'\uD83C\uDF38'}
            </text>
          </svg>

          <div className={styles.previewMeta}>
            <span className={styles.previewMetaDot} />
            <span>{previewTimeframe}</span>
            <span className={styles.previewMetaSep}>|</span>
            <span>{previewStartLabel}</span>
          </div>

          {mandalaMsg && (
            <div className={styles.emptyMandalaMsg}>{mandalaMsg}</div>
          )}
        </div>
      </div>
    </div>
  );
}
