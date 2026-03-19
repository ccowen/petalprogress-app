import styles from './InsightsPage.module.css';

/* ── Static demo data (matches wireframe exactly) ── */

interface StatCard {
  num: string;
  label: string;
  delta: string;
  deltaType: 'up' | 'down' | 'muted';
  numColor?: string;
}

const STATS: StatCard[] = [
  {
    num: '24',
    label: 'Active members',
    delta: '\u2191 3 this month',
    deltaType: 'up',
  },
  {
    num: '82%',
    label: 'Monthly completion',
    delta: '\u2191 5% from last month',
    deltaType: 'up',
  },
  {
    num: '78%',
    label: 'Completion this week',
    delta: '\u2193 4% from last week',
    deltaType: 'down',
  },
  {
    num: '3',
    label: 'At-risk members',
    delta: 'Missed 3+ days',
    deltaType: 'muted',
    numColor: 'var(--pp-coral, #C45A5A)',
  },
];

interface AtRiskMember {
  initials: string;
  color: string;
  name: string;
  habit: string;
  days: string;
}

const AT_RISK: AtRiskMember[] = [
  {
    initials: 'JL',
    color: '#C45A5A',
    name: 'Jordan Lee',
    habit: 'Morning Stretch',
    days: '4 days missed',
  },
  {
    initials: 'TC',
    color: '#9B8FA6',
    name: 'Tyler Chen',
    habit: 'Morning Stretch',
    days: '5 days missed',
  },
  {
    initials: 'DM',
    color: '#C45A5A',
    name: 'Dana Morris',
    habit: 'Morning Stretch',
    days: '3 days missed',
  },
];

interface TopCompleter {
  initials: string;
  color: string;
  name: string;
  habit: string;
  pct: number;
}

const TOP_COMPLETERS: TopCompleter[] = [
  {
    initials: 'SK',
    color: '#8FA68C',
    name: 'Sarah Kim',
    habit: 'Morning Stretch',
    pct: 100,
  },
  {
    initials: 'SS',
    color: '#7B9BAF',
    name: 'Sam Sato',
    habit: 'Morning Stretch',
    pct: 87,
  },
  {
    initials: 'AR',
    color: '#7B9BAF',
    name: 'Alex Rivera',
    habit: 'Morning Stretch',
    pct: 74,
  },
];

/* ── Delta class helper ── */
function deltaClass(type: StatCard['deltaType']): string {
  if (type === 'up') return styles.deltaUp;
  if (type === 'down') return styles.deltaDown;
  return styles.deltaMuted;
}

/* ── Main component ── */
export default function InsightsPage() {
  return (
    <div className={styles.adminPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Insights</h1>
        <button className={styles.exportBtn}>Export report</button>
      </div>

      {/* Stats grid */}
      <div className={styles.statsGrid}>
        {STATS.map((s) => (
          <div className={styles.statCard} key={s.label}>
            <div
              className={styles.statCardNum}
              style={s.numColor ? { color: s.numColor } : undefined}
            >
              {s.num}
            </div>
            <div className={styles.statCardLbl}>{s.label}</div>
            <div className={`${styles.statCardDelta} ${deltaClass(s.deltaType)}`}>
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Two-column section row */}
      <div className={styles.sectionRow}>
        {/* At-risk card */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>At risk</div>
            <div className={styles.badgeRisk}>Missed 3+ days</div>
          </div>
          <table className={styles.miniTable}>
            <tbody>
              {AT_RISK.map((m) => (
                <tr key={m.name}>
                  <td>
                    <div className={styles.miniMember}>
                      <div
                        className={styles.miniAv}
                        style={{ background: m.color }}
                      >
                        {m.initials}
                      </div>
                      <div>
                        <div className={styles.miniName}>{m.name}</div>
                        <div className={styles.miniSub}>{m.habit}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.riskDays}>{m.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top completion card */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>Top completion rates</div>
            <div className={styles.badgeGood}>This month</div>
          </div>
          <table className={styles.miniTable}>
            <tbody>
              {TOP_COMPLETERS.map((m) => (
                <tr key={m.name}>
                  <td>
                    <div className={styles.miniMember}>
                      <div
                        className={styles.miniAv}
                        style={{ background: m.color }}
                      >
                        {m.initials}
                      </div>
                      <div>
                        <div className={styles.miniName}>{m.name}</div>
                        <div className={styles.miniSub}>{m.habit}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.streakBarWrap}>
                      <div className={styles.streakBar}>
                        <div
                          className={styles.streakBarFill}
                          style={{ width: `${m.pct}%` }}
                        />
                      </div>
                      <div className={styles.streakNum}>{m.pct}%</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print section */}
      <div className={styles.printSection}>
        <div>
          <h3 className={styles.printTitle}>Print member mandalas</h3>
          <p className={styles.printDesc}>
            Generate a printable sheet of your members' current mandalas &mdash;
            great for posting on a studio board or handing out at class.
          </p>
        </div>
        <button className={styles.printBtn}>Generate print sheet</button>
      </div>
    </div>
  );
}
