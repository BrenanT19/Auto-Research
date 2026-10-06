export function CatalogPagination({
  page, total, pending, onPageChange,
}: {
  page: number;
  total: number;
  pending: boolean;
  onPageChange: (page: number) => void;
}) {
  if (total <= 24) return null;
  return <nav className="catalog-pagination" aria-label="Vehicle catalog pages">
    <button disabled={page === 0 || pending} onClick={() => onPageChange(page - 1)}>Previous</button>
    <span>Page {page + 1} of {Math.ceil(total / 24)}</span>
    <button disabled={(page + 1) * 24 >= total || pending} onClick={() => onPageChange(page + 1)}>Next</button>
  </nav>;
}
