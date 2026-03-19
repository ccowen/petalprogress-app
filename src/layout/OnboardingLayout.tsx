import { Outlet, Link } from "react-router";
import s from "./OnboardingLayout.module.css";

export default function OnboardingLayout() {
  return (
    <>
      <nav className={s.topbar}>
        <Link to="/onboarding" className={s.logoZone}>
          <span className={s.logo}>{"\u{16A9B}"}</span>
          <span className={s.logoName}>PetalProgress</span>
        </Link>
        <div className={s.navTabs}>
          <span className={`${s.navTab} ${s.disabled}`}>Gallery</span>
          <span className={`${s.navTab} ${s.disabled}`}>Calendar</span>
        </div>
        <div className={s.topbarRight}>
          <div className={s.avatar}>CW</div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
