import { Outlet, Link, useLocation } from "react-router";
import AvatarDropdown from "./AvatarDropdown.tsx";
import type { DropdownItem } from "./AvatarDropdown.tsx";
import s from "./AdminLayout.module.css";

const navLinks = [
  { to: "/admin/members", label: "Members" },
  { to: "/admin/habits", label: "Habits" },
  { to: "/admin/insights", label: "Insights" },
];

const dropdownItems: DropdownItem[] = [
  { section: "Organization" },
  { label: "Organization settings", href: "#" },
  { label: "Billing & plan", href: "#" },
  { separator: true },
  { label: "Switch to my personal view \u21D4", href: "/mandala" },
  { separator: true },
  { label: "petalprogress.com \u2197", href: "/", muted: true },
  { label: "Shop Extras \u2197", href: "#", muted: true },
  { separator: true },
  { label: "Sign out", href: "/login", danger: true },
];

export default function AdminLayout() {
  const { pathname } = useLocation();

  return (
    <>
      <nav className={s.nav}>
        <Link to="/admin/members" className={s.logo}>
          <span>{"\u{16A9B}"}</span> PetalProgress
        </Link>
        <span className={s.badge}>Teams</span>
        <div className={s.links}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`${s.link} ${pathname.startsWith(link.to) ? s.active : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <AvatarDropdown color="amber" initials="CW" items={dropdownItems} />
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
