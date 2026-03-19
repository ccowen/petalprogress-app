import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './MembersPage.module.css';
import OrgNameModal from './OrgNameModal.tsx';

/* ── Static demo data (matches wireframe exactly) ── */

interface HabitChip {
  name: string;
  color: string;
}

interface Member {
  initials: string;
  avatarColor: string;
  name: string;
  email: string;
  habits: HabitChip[];
  lastCheckIn: string;
  status: 'on-track' | 'at-risk' | 'new';
}

const MEMBERS: Member[] = [
  {
    initials: 'SK',
    avatarColor: '#8FA68C',
    name: 'Sarah Kim',
    email: 's.kim@example.com',
    habits: [
      { name: 'Morning Stretch', color: '#8FA68C' },
      { name: 'Evening Walk', color: '#7B9BAF' },
    ],
    lastCheckIn: 'Today',
    status: 'on-track',
  },
  {
    initials: 'AR',
    avatarColor: '#7B9BAF',
    name: 'Alex Rivera',
    email: 'alex.r@example.com',
    habits: [{ name: 'Morning Stretch', color: '#8FA68C' }],
    lastCheckIn: 'Yesterday',
    status: 'on-track',
  },
  {
    initials: 'JL',
    avatarColor: '#C45A5A',
    name: 'Jordan Lee',
    email: 'j.lee@example.com',
    habits: [
      { name: 'Morning Stretch', color: '#8FA68C' },
      { name: 'Mindfulness', color: '#C4887A' },
    ],
    lastCheckIn: '4 days ago',
    status: 'at-risk',
  },
  {
    initials: 'MP',
    avatarColor: '#C4887A',
    name: 'Maya Patel',
    email: 'm.patel@example.com',
    habits: [{ name: 'Evening Cooldown', color: '#7B9BAF' }],
    lastCheckIn: 'Today',
    status: 'on-track',
  },
  {
    initials: 'TC',
    avatarColor: '#9B8FA6',
    name: 'Tyler Chen',
    email: 't.chen@example.com',
    habits: [{ name: 'Morning Stretch', color: '#8FA68C' }],
    lastCheckIn: '5 days ago',
    status: 'at-risk',
  },
  {
    initials: 'RN',
    avatarColor: '#8FA68C',
    name: 'Riley Nash',
    email: 'r.nash@example.com',
    habits: [
      { name: 'Evening Cooldown', color: '#7B9BAF' },
      { name: 'Mindfulness', color: '#C4887A' },
      { name: 'Morning Stretch', color: '#8FA68C' },
    ],
    lastCheckIn: 'Today',
    status: 'on-track',
  },
  {
    initials: 'DM',
    avatarColor: '#C45A5A',
    name: 'Dana Morris',
    email: 'd.morris@example.com',
    habits: [{ name: 'Morning Stretch', color: '#8FA68C' }],
    lastCheckIn: '3 days ago',
    status: 'at-risk',
  },
  {
    initials: 'SS',
    avatarColor: '#7B9BAF',
    name: 'Sam Sato',
    email: 's.sato@example.com',
    habits: [
      { name: 'Morning Stretch', color: '#8FA68C' },
      { name: 'Evening Walk', color: '#7B9BAF' },
    ],
    lastCheckIn: 'Today',
    status: 'on-track',
  },
  {
    initials: 'EW',
    avatarColor: '#C4887A',
    name: 'Emma Walsh',
    email: 'e.walsh@example.com',
    habits: [{ name: 'Evening Cooldown', color: '#7B9BAF' }],
    lastCheckIn: '2 days ago',
    status: 'on-track',
  },
  {
    initials: 'CB',
    avatarColor: '#9B8FA6',
    name: 'Chris Brooks',
    email: 'c.brooks@example.com',
    habits: [{ name: 'Morning Stretch', color: '#8FA68C' }],
    lastCheckIn: 'Today',
    status: 'new',
  },
];

/* ── Coach mark definitions ── */
interface CoachStepDef {
  targetRef: 'avatar' | 'habits' | 'invite';
  align: 'right' | 'center' | 'left';
  title: string;
  text: string;
  isLast?: boolean;
}

const COACH_STEPS: CoachStepDef[] = [
  {
    targetRef: 'avatar',
    align: 'right',
    title: 'Your free trial',
    text: 'Your account starts with 1\u201310 members for 7 days, no card required. Upgrade anytime via Account \u2192 Billing & plan.',
  },
  {
    targetRef: 'habits',
    align: 'center',
    title: 'Create a habit mandala',
    text: 'Head to Habits to build an assigned habit. Each member gets a mandala that fills as they check in daily.',
  },
  {
    targetRef: 'invite',
    align: 'left',
    title: 'Invite your members',
    text: "Add members by email or share a unique link \u2014 they'll each get their own mandala once they join.",
    isLast: true,
  },
];

/* ── Status badge helper ── */
function StatusBadge({ status }: { status: Member['status'] }) {
  if (status === 'on-track') {
    return <span className={styles.statusOnTrack}>{'\u25CF'} On track</span>;
  }
  if (status === 'at-risk') {
    return <span className={styles.statusAtRisk}>{'\u26A0'} At risk</span>;
  }
  return <span className={styles.statusNew}>New</span>;
}

/* ── Main component ── */
export default function MembersPage() {
  /* Org-name modal state */
  const [showOrgModal, setShowOrgModal] = useState(false);
  /* Coach mark state */
  const [coachIdx, setCoachIdx] = useState(-1);
  const [coachPos, setCoachPos] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
  } | null>(null);

  /* Refs for coach-mark target elements */
  const avatarRef = useRef<HTMLDivElement>(null);
  const habitsRef = useRef<HTMLTableCellElement>(null);
  const inviteRef = useRef<HTMLButtonElement>(null);

  const getTargetRef = useCallback(
    (key: CoachStepDef['targetRef']): HTMLElement | null => {
      if (key === 'avatar') return avatarRef.current;
      if (key === 'habits') return habitsRef.current;
      return inviteRef.current;
    },
    [],
  );

  /* On mount: check if first visit */
  useEffect(() => {
    if (!localStorage.getItem('ppAdminOnboarded')) {
      setShowOrgModal(true);
    }
  }, []);

  /* Position the coach mark whenever coachIdx changes */
  useEffect(() => {
    if (coachIdx < 0 || coachIdx >= COACH_STEPS.length) {
      setCoachPos(null);
      return;
    }

    const step = COACH_STEPS[coachIdx];
    const target = getTargetRef(step.targetRef);
    if (!target) return;

    // Use rAF for accurate layout measurement
    requestAnimationFrame(() => {
      const tr = target.getBoundingClientRect();
      const markWidth = 264;

      let left: number;
      if (step.align === 'right') left = tr.right - markWidth;
      else if (step.align === 'center') left = tr.left + tr.width / 2 - markWidth / 2;
      else left = tr.left;

      left = Math.max(12, Math.min(left, window.innerWidth - markWidth - 12));

      const arrowLeft = Math.max(
        12,
        Math.min(tr.left + tr.width / 2 - left - 7, markWidth - 26),
      );

      setCoachPos({ top: tr.bottom + 10, left, arrowLeft });
    });
  }, [coachIdx, getTargetRef]);

  /* Coach mark handlers */
  const startCoachTour = useCallback(() => {
    setCoachIdx(0);
  }, []);

  const nextCoach = useCallback(() => {
    const next = coachIdx + 1;
    if (next >= COACH_STEPS.length) {
      setCoachIdx(-1);
      localStorage.setItem('ppAdminOnboarded', '1');
    } else {
      setCoachIdx(next);
    }
  }, [coachIdx]);

  const dismissCoach = useCallback(() => {
    setCoachIdx(-1);
    localStorage.setItem('ppAdminOnboarded', '1');
  }, []);

  const handleOrgSave = useCallback(
    (_orgName: string) => {
      setShowOrgModal(false);
      localStorage.setItem('ppAdminOnboarded', '1');
      setTimeout(() => startCoachTour(), 200);
    },
    [startCoachTour],
  );

  const coachActive = coachIdx >= 0 && coachIdx < COACH_STEPS.length;
  const currentCoachStep = coachActive ? COACH_STEPS[coachIdx] : null;

  return (
    <div className={styles.adminPage}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Members</h1>
        <button className={styles.actionBtn} ref={inviteRef}>
          + Invite member
        </button>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statChip}>
          <strong>24</strong> active members
        </div>
        <div className={styles.statChip}>
          <strong>78%</strong> checked in this week
        </div>
        <div className={styles.statChipRisk}>
          <strong>3</strong> at risk
        </div>
      </div>

      {/* Members table */}
      <div className={styles.membersTableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Member</th>
              <th ref={habitsRef}>Habits</th>
              <th>Last check-in</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {MEMBERS.map((m) => (
              <tr
                key={m.email}
                className={m.status === 'at-risk' ? styles.rowAtRisk : undefined}
              >
                <td>
                  <div className={styles.memberCell}>
                    <div
                      className={styles.memberAvatar}
                      style={{ background: m.avatarColor }}
                      ref={m.initials === 'CB' ? avatarRef : undefined}
                    >
                      {m.initials}
                    </div>
                    <div>
                      <div className={styles.memberName}>{m.name}</div>
                      <div className={styles.memberEmail}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.habitChips}>
                    {m.habits.map((h) => (
                      <span className={styles.habitChip} key={h.name}>
                        <span
                          className={styles.habitChipDot}
                          style={{ background: h.color }}
                        />
                        {h.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{m.lastCheckIn}</td>
                <td>
                  <StatusBadge status={m.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <span className={styles.paginationInfo}>
          Showing 1&ndash;10 of 24 members
        </span>
        <div className={styles.paginationBtns}>
          <button className={styles.pgBtn} disabled>
            &larr; Prev
          </button>
          <button className={styles.pgBtnActive}>1</button>
          <button className={styles.pgBtn}>2</button>
          <button className={styles.pgBtn}>3</button>
          <button className={styles.pgBtn}>Next &rarr;</button>
        </div>
      </div>

      {/* ── Org name modal ── */}
      {showOrgModal && <OrgNameModal onSave={handleOrgSave} />}

      {/* ── Coach marks ── */}
      {coachActive && (
        <>
          <div className={styles.coachSpotlight} />
          {coachPos && currentCoachStep && (
            <div
              className={styles.coachMark}
              style={{ top: coachPos.top, left: coachPos.left }}
            >
              <div
                className={styles.coachMarkArrow}
                style={{ left: coachPos.arrowLeft }}
              />
              <div className={styles.coachStep}>
                {coachIdx + 1} of {COACH_STEPS.length}
              </div>
              <div className={styles.coachTitle}>
                {currentCoachStep.title}
              </div>
              <div className={styles.coachText}>
                {currentCoachStep.text}
              </div>
              <div className={styles.coachFooter}>
                <button className={styles.coachSkip} onClick={dismissCoach}>
                  Skip tour
                </button>
                <button className={styles.coachNext} onClick={nextCoach}>
                  {currentCoachStep.isLast ? 'Got it \u2713' : 'Next \u2192'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
