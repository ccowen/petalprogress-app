import { Outlet, Link, useLocation } from "react-router";
import AvatarDropdown from "./AvatarDropdown.tsx";
import type { DropdownItem } from "./AvatarDropdown.tsx";
import s from "./AppLayout.module.css";

const navLinks = [
  { to: "/mandala", label: "Mandala" },
  { to: "/gallery", label: "Gallery" },
  { to: "/calendar", label: "Calendar" },
];

const dropdownItems: DropdownItem[] = [
  { section: "My account" },
  { label: "Account settings", href: "#" },
  { label: "Billing & upgrade \u2726", href: "/pricing" },
  { separator: true },
  { label: "petalprogress.com \u2197", href: "/" },
  { separator: true },
  { label: "Sign out", href: "/login", danger: true },
];

export default function AppLayout() {
  const { pathname } = useLocation();

  return (
    <>
      <nav className={s.nav}>
        <Link to="/mandala" className={s.logo}>
          <span>𖢻</span> PetalProgress
        </Link>
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
        <AvatarDropdown color="sage" initials="CW" items={dropdownItems} />
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
