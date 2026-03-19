import s from "./Pagination.module.css";

interface PaginationProps {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, total, perPage, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  return (
    <div className={s.pagination}>
      <button
        className={s.arrow}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        &larr; Prev
      </button>
      <span className={s.info}>
        Page {page} of {totalPages}
      </span>
      <button
        className={s.arrow}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next &rarr;
      </button>
    </div>
  );
}
