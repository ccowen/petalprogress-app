import { useState, useCallback, useMemo } from 'react';
import styles from './OnboardingReferralPage.module.css';

/* ── Referral data (would come from server in production) ── */

const REFERRAL = {
  habitName: 'Morning Meditation',
  from: 'Sunrise Fitness Studio',
  startLabel: 'Jan 1, 2026',
  endLabel: 'Mar 31, 2026',
  datesLabel: 'Jan 1 \u2013 Mar 31, 2026',
  duration: 'Quarterly',
  weeks: '13 weeks',
  days: '91 days',
  frequency: 4,
  freqNote: 'A solid rhythm \u2014 four days leaves room for life.',
  petalColor: '#C4887A',
} as const;

/* ── Constants ── */

const TOTAL_VISUAL_STEPS = 4;

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

export default function OnboardingReferralPage() {
  const [currentStep, setCurrentStep] = useState<StepId>(0);

  /* Hint toggles */
  const [habitHintOpen, setHabitHintOpen] = useState(false);
  const [tfHintOpen, setTfHintOpen] = useState(false);

  const goalN = REFERRAL.frequency;
  const petalColor = REFERRAL.petalColor;

  /* ── Step navigation ── */
  const goStep = useCallback((n: StepId) => {
    setCurrentStep(n);
  }, []);

  /* ── Step dots (amber accent) ── */
  const stepDots = useMemo(() => {
    const cur =
      currentStep <= 0
        ? 0
        : currentStep === 2
          ? 1
          : currentStep === 3
            ? 2
            : currentStep === 4
              ? 3
              : 4;
    return Array.from({ length: TOTAL_VISUAL_STEPS }, (_, i) => {
      if (i < cur) return <div key={i} className={styles.sdotDone} />;
      if (i === cur) return <div key={i} className={styles.sdotActive} />;
      return <div key={i} className={styles.sdotFuture} />;
    });
  }, [currentStep]);

  /* ── Mandala rings ── */
  const mandalaRings = useMemo(() => {
    const cx = 160;
    const cy = 160;
    const s = currentStep;
    const rings: React.ReactElement[] = [];

    if (s >= 2) rings.push(...buildRing(8, 40, 5, 12, undefined, cx, cy, petalColor));
    if (s >= 4)
      rings.push(
        ...buildRing(12, 66, 5.5, 13, Math.round((goalN / 7) * 12), cx, cy, petalColor),
      );
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
            Your coach has set up <em>a habit for you.</em>
          </div>
          <div className={styles.stepDesc}>
            PetalProgress connects you directly to your coach&rsquo;s program. Your habit and
            timeframe are already set &mdash; all you need to do is show up each day and check in.
          </div>
          <div className={styles.stepDescNoMargin}>
            We&rsquo;ll walk you through what&rsquo;s been set up and get your mandala ready. It
            only takes a moment.
          </div>
          <div className={styles.stepNav}>
            <button className={styles.btnNext} onClick={() => goStep(2)}>
              Get started &rarr;
            </button>
          </div>
        </div>

        {/* STEP 2: Sponsored Habit (read-only) */}
        <div className={currentStep === 2 ? styles.stepShow : styles.step}>
          <div className={styles.stepEyebrow}>Step 1 of 4 &middot; Your Habit</div>
          <div className={styles.stepTitle}>
            Your <em>sponsored habit.</em>
          </div>
          <div className={styles.stepDesc}>
            Your coach has assigned this habit to your account. It will appear in your mandala
            automatically &mdash; you just check in each day.
          </div>

          <div className={styles.sponsoredCard}>
            <div className={styles.sponsoredBadge}>
              {'\u25D1'} From your referral
            </div>
            <div className={styles.sponsoredHabitName}>{REFERRAL.habitName}</div>
            <div className={styles.sponsoredFrom}>
              <div className={styles.sponsoredFromDot} />
              <span>Assigned by {REFERRAL.from}</span>
            </div>
          </div>

          <button
            className={styles.hintToggle}
            onClick={() => setHabitHintOpen(!habitHintOpen)}
          >
            <span
              className={habitHintOpen ? styles.hintToggleIconOpen : styles.hintToggleIcon}
            >
              &#9654;
            </span>{' '}
            Can I add my own habits too?
          </button>

          {habitHintOpen && (
            <div className={styles.hintBody}>
              <p>
                Yes &mdash; once you&rsquo;re in the app, you can add personal habits of your own
                alongside the ones your coach has assigned. Your sponsored habits and personal habits
                live in the same mandala.
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

        {/* STEP 3: Sponsored Timeframe (read-only) */}
        <div className={currentStep === 3 ? styles.stepShow : styles.step}>
          <div className={styles.stepEyebrow}>Step 2 of 4 &middot; Your Timeframe</div>
          <div className={styles.stepTitle}>
            Your <em>timeframe</em> for this habit.
          </div>
          <div className={styles.stepDesc}>
            Your coach has set the duration of this program. Your mandala will cover this exact
            period.
          </div>

          <div className={styles.timeframeDisplayCard}>
            <div className={styles.sponsoredBadge}>
              {'\u25D1'} From your referral
            </div>
            <div className={styles.timeframeDisplayDates}>{REFERRAL.datesLabel}</div>
            <div className={styles.timeframeDisplayMeta}>
              <span className={styles.timeframeChip}>{REFERRAL.duration}</span>
              <span className={styles.timeframeChip}>{REFERRAL.weeks}</span>
              <span className={styles.timeframeChip}>{REFERRAL.days}</span>
            </div>
          </div>

          <button
            className={styles.hintToggle}
            onClick={() => setTfHintOpen(!tfHintOpen)}
          >
            <span
              className={tfHintOpen ? styles.hintToggleIconOpen : styles.hintToggleIcon}
            >
              &#9654;
            </span>{' '}
            What happens after this period ends?
          </button>

          {tfHintOpen && (
            <div className={styles.hintBody}>
              <p>
                Your mandala for this program will be marked complete. You can start a new mandala at
                any time &mdash; your coach may also assign a follow-on program.
              </p>
              <p>All your completed mandalas are saved in your Gallery forever.</p>
            </div>
          )}

          <div className={styles.stepNav}>
            <button className={styles.btnBack} onClick={() => goStep(2)}>
              Back
            </button>
            <button className={styles.btnNext} onClick={() => goStep(4)}>
              Continue &rarr;
            </button>
          </div>
        </div>

        {/* STEP 4: Rhythm (read-only) */}
        <div className={currentStep === 4 ? styles.stepShow : styles.step}>
          <div className={styles.stepEyebrow}>Step 3 of 4 &middot; Your Rhythm</div>
          <div className={styles.stepTitle}>
            How often <em>your coach recommends</em>
          </div>
          <div className={styles.stepDesc}>
            Your coach has set a recommended check-in frequency for this program.
          </div>

          <div className={styles.timeframeDisplayCard}>
            <div className={styles.sponsoredBadge}>
              {'\u25D1'} From your referral
            </div>
            <div className={styles.timeframeDisplayDates}>
              {REFERRAL.frequency} &times; per week
            </div>
            <div className={styles.timeframeDisplayMeta}>
              <span className={styles.timeframeChip}>{REFERRAL.freqNote}</span>
            </div>
          </div>

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
            Every time you check in, your mandala grows richer. Your coach can see your progress
            &mdash; and so can you.
          </div>
          <div className={styles.stepNav}>
            <button className={styles.btnBack} onClick={() => goStep(4)}>
              Back
            </button>
            <button className={styles.btnNextAmber} onClick={finish}>
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
            <div className={styles.previewHabitName}>{REFERRAL.habitName}</div>
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
            <span>{REFERRAL.duration} mandala</span>
            <span className={styles.previewMetaSep}>|</span>
            <span>{REFERRAL.datesLabel}</span>
          </div>

          {mandalaMsg && (
            <div className={styles.emptyMandalaMsg}>{mandalaMsg}</div>
          )}
        </div>
      </div>
    </div>
  );
}
