import s from "./HabitsPage.module.css";

interface MemberPill {
  initials: string;
  name: string;
  color: string;
}

interface HabitData {
  icon: string;
  iconBg: string;
  name: string;
  freq: string;
  assignedLabel: string;
  members: MemberPill[];
  moreCount: number | null;
  moreLabel: string | null;
}

const habits: HabitData[] = [
  {
    icon: "\uD83C\uDF05",
    iconBg: "rgba(185,83,106,.15)",
    name: "Morning Stretch",
    freq: "Daily",
    assignedLabel: "Assigned to 18 members",
    members: [
      { initials: "SK", name: "Sarah K.", color: "#B9536A" },
      { initials: "AR", name: "Alex R.", color: "#539BCF" },
      { initials: "MP", name: "Maya P.", color: "#D49537" },
    ],
    moreCount: 15,
    moreLabel: "+15 more",
  },
  {
    icon: "\uD83C\uDF19",
    iconBg: "rgba(83,155,207,.12)",
    name: "Evening Cooldown",
    freq: "Daily",
    assignedLabel: "Assigned to 6 members",
    members: [
      { initials: "MP", name: "Maya P.", color: "#D49537" },
      { initials: "RN", name: "Riley N.", color: "#B9536A" },
      { initials: "EW", name: "Emma W.", color: "#539BCF" },
    ],
    moreCount: 3,
    moreLabel: "+3 more",
  },
  {
    icon: "\uD83D\uDCA7",
    iconBg: "rgba(212,149,55,.1)",
    name: "Hydration Check-in",
    freq: "3\u00D7 / week",
    assignedLabel: "Assigned to all members",
    members: [],
    moreCount: null,
    moreLabel: "All 24 members",
  },
];

export default function HabitsPage() {
  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Habits</h1>
        <button className={s.actionBtn}>+ Create habit</button>
      </div>

      <div className={s.list}>
        {habits.map((h) => (
          <div key={h.name} className={s.card}>
            <div className={s.icon} style={{ background: h.iconBg }}>
              {h.icon}
            </div>
            <div className={s.body}>
              <div className={s.name}>{h.name}</div>
              <div className={s.meta}>
                <span>{h.freq}</span>
                <span className={s.metaDot}>&middot;</span>
                <span>{h.assignedLabel}</span>
              </div>
              <div className={s.assigned}>
                {h.members.map((m) => (
                  <div key={m.initials + m.name} className={s.memberPill}>
                    <div className={s.memberPillAv} style={{ background: m.color }}>
                      {m.initials}
                    </div>
                    {m.name}
                  </div>
                ))}
                {h.moreLabel && (
                  <div className={s.morePill}>{h.moreLabel}</div>
                )}
              </div>
            </div>
            <div className={s.actions}>
              <button className={`${s.actionBtnSmall} ${s.edit}`}>Edit</button>
              <button className={`${s.actionBtnSmall} ${s.assign}`}>Assign</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
