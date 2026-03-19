import { useState, useEffect, useRef } from "react";
import s from "./AvatarDropdown.module.css";

export interface DropdownItem {
  label?: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  muted?: boolean;
  separator?: boolean;
  section?: string;
}

interface AvatarDropdownProps {
  color: "sage" | "amber";
  initials: string;
  items: DropdownItem[];
}

export default function AvatarDropdown({
  color,
  initials,
  items,
}: AvatarDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className={s.wrapper} ref={ref}>
      <button
        className={`${s.btn} ${s[color]}`}
        onClick={() => setOpen((o) => !o)}
      >
        {initials}
      </button>
      {open && (
        <div className={s.dropdown}>
          {items.map((item, i) => {
            if (item.separator) {
              return <div key={`sep-${i}`} className={s.sep} />;
            }
            if (item.section) {
              return (
                <div key={`sec-${i}`} className={s.section}>
                  {item.section}
                </div>
              );
            }
            const cls = [
              s.item,
              item.danger ? s.danger : "",
              item.muted ? s.muted : "",
            ]
              .filter(Boolean)
              .join(" ");

            if (item.href) {
              return (
                <a
                  key={i}
                  href={item.href}
                  className={cls}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              );
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
