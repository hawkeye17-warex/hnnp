import React, {useEffect, useMemo, useState} from 'react';
import EmptyState from './EmptyState';

type SortDirection = 'asc' | 'desc';

export type DataTableColumn<T> = {
  id: string;
  header: string;
  field?: keyof T;
  accessor?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
};

export type DataTableProps<T> = {
  data: T[];
  columns: Array<DataTableColumn<T>>;
  getId: (row: T) => string;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFn?: (row: T, term: string) => boolean;
  bulkActions?:
    | React.ReactNode
    | ((selected: T[]) => React.ReactNode)
    | {label: string; onClick: (selected: T[]) => void}[];
  emptyMessage?: string;
};

function DataTable<T>({
  data,
  columns,
  getId,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Search',
  searchFn,
  bulkActions,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  const tableData = Array.isArray(data) ? data : [];
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSort = (id: string) => {
    if (sortBy !== id) {
      setSortBy(id);
      setSortDir('asc');
      return;
    }
    setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tableData;
    if (searchFn) {
      return tableData.filter(row => searchFn(row, term));
    }
    return tableData.filter(row =>
      columns.some(col => {
        const value =
          col.accessor?.(row) ??
          (col.field ? (row as any)[col.field] : undefined);
        if (value === undefined || value === null) return false;
        return String(value).toLowerCase().includes(term);
      }),
    );
  }, [data, search, searchFn, columns]);

  const sorted = useMemo(() => {
    if (!sortBy) return filtered;
    const col = columns.find(c => c.id === sortBy);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const va =
        col.field !== undefined ? (a as any)[col.field] : col.accessor?.(a);
      const vb =
        col.field !== undefined ? (b as any)[col.field] : col.accessor?.(b);
      const sa = String(va ?? '');
      const sb = String(vb ?? '');
      if (sa === sb) return 0;
      return sortDir === 'asc' ? (sa > sb ? 1 : -1) : sa < sb ? 1 : -1;
    });
  }, [filtered, sortBy, sortDir, columns]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));

  useEffect(() => {
    setPage(p => Math.min(pageCount, Math.max(1, p)));
  }, [pageCount]);

  const allVisibleIds = paged.map(getId);
  const allVisibleSelected = allVisibleIds.every(id => selected.has(id));

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        allVisibleIds.forEach(id => next.delete(id));
      } else {
        allVisibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const selectedRows = useMemo(
    () => sorted.filter(row => selected.has(getId(row))),
    [sorted, selected, getId],
  );

  const renderBulkActions = () => {
    if (!bulkActions || selectedRows.length === 0) return null;
    if (Array.isArray(bulkActions)) {
      return bulkActions.map(action => (
        <button
          key={action.label}
          className="secondary"
          onClick={() => action.onClick(selectedRows)}>
          {action.label}
        </button>
      ));
    }
    if (typeof bulkActions === 'function') {
      return bulkActions(selectedRows);
    }
    return bulkActions;
  };

  return (
    <div className="datatable">
      <div className="datatable__header">
        {searchable ? (
          <input
            className="input"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        ) : (
          <div />
        )}
        <div className="datatable__actions">{renderBulkActions()}</div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="table datatable__table">
          <div className="table__row table__head" style={{gridTemplateColumns: `40px ${columns.map(c => c.width ?? '1fr').join(' ')}`}}>
            <div>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                aria-label="Select all on page"
              />
            </div>
            {columns.map(col => (
              <div
                key={col.id}
                style={{cursor: col.sortable ? 'pointer' : 'default'}}
                onClick={() => (col.sortable ? toggleSort(col.id) : undefined)}>
                {col.header}
                {col.sortable && sortBy === col.id ? (
                  <span className="datatable__sort">{sortDir === 'asc' ? '↑' : '↓'}</span>
                ) : null}
              </div>
            ))}
          </div>
          {paged.map(row => {
            const id = getId(row);
            return (
              <div
                className="table__row"
                key={id}
                style={{gridTemplateColumns: `40px ${columns.map(c => c.width ?? '1fr').join(' ')}`}}>
                <div>
                  <input
                    type="checkbox"
                    checked={selected.has(id)}
                    onChange={() => toggleRow(id)}
                    aria-label={`Select row ${id}`}
                  />
                </div>
                {columns.map(col => (
                  <div key={col.id}>
                    {col.accessor ? col.accessor(row) : col.field ? (row as any)[col.field] : null}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="pagination datatable__pagination">
        <button
          className="secondary"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}>
          Previous
        </button>
        <span className="muted">
          Page {page} of {pageCount}
        </span>
        <button
          className="secondary"
          onClick={() => setPage(p => Math.min(pageCount, p + 1))}
          disabled={page === pageCount}>
          Next
        </button>
      </div>
    </div>
  );
}

export default DataTable;
