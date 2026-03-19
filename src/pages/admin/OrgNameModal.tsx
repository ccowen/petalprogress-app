import { useState, useCallback, type KeyboardEvent } from 'react';
import styles from './OrgNameModal.module.css';

interface OrgNameModalProps {
  onSave: (orgName: string) => void;
}

export default function OrgNameModal({ onSave }: OrgNameModalProps) {
  const [value, setValue] = useState('');

  const handleSave = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    localStorage.setItem('pp-org', trimmed);
    onSave(trimmed);
  }, [value, onSave]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSave();
    },
    [handleSave],
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <span className={styles.logo}>{'\u{16B9B}'} PetalProgress</span>
        <h2 className={styles.title}>What's your organization called?</h2>
        <p className={styles.sub}>
          This will appear on your members' invites and in your dashboard.
        </p>
        <input
          className={styles.input}
          type="text"
          placeholder="e.g. Riverdale CrossFit"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className={styles.btn} onClick={handleSave}>
          Save &amp; continue
        </button>
      </div>
    </div>
  );
}
