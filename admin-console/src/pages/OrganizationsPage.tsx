import React, {useEffect, useMemo, useRef, useState} from 'react';

import Card from '../components/Card';
import {Link} from 'react-router-dom';
import DataTable, {DataTableColumn} from '../components/DataTable';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import {useApi} from '../api/client';
import Modal from '../components/Modal';
import TextInput from '../components/form/TextInput';
import SubmitButton from '../components/form/SubmitButton';

type OrgRow = {
  id: string;
  name?: string;
  address?: string;
  contact_email?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
};

const OrganizationsPage = () => {
  const api = useApi();
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setReadOnly(false);
    try {
      const data = await api.getOrganizations();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setRows(list);
    } catch (err: any) {
      // Most org-scoped keys cannot list all orgs. Fallback to current org so the page still works.
      try {
        const single = await api.getOrg();
        setRows(single ? [single] : []);
        setReadOnly(true);
      } catch (inner: any) {
        setError(inner?.message ?? err?.message ?? 'Failed to load organizations.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo<DataTableColumn<OrgRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessor: row => (
          <Link to={`/organizations/${row.id}`}>{row.name ?? '—'}</Link>
        ),
        sortable: true,
      },
      {id: 'address', header: 'Address', field: 'address', sortable: true},
      {id: 'contact_email', header: 'Contact Email', field: 'contact_email', sortable: true},
      {id: 'timezone', header: 'Timezone', field: 'timezone', sortable: true},
      {id: 'created_at', header: 'Created', accessor: row => formatTime(row.created_at), sortable: true},
      {id: 'updated_at', header: 'Updated', accessor: row => formatTime(row.updated_at), sortable: true},
    ],
    [],
  );

  const filteredRows = useMemo(() => {
    const term = search.toLowerCase();
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() : null;
    return rows.filter(r => {
      const matchesTerm =
        !term ||
        (r.name ?? '').toLowerCase().includes(term) ||
        (r.address ?? '').toLowerCase().includes(term) ||
        (r.contact_email ?? '').toLowerCase().includes(term);
      const created = r.created_at ? new Date(r.created_at).getTime() : null;
      const matchesFrom = from === null || (created !== null && created >= from);
      const matchesTo = to === null || (created !== null && created <= to);
      return matchesTerm && matchesFrom && matchesTo;
    });
  }, [rows, search, fromDate, toDate]);

  const exportCsv = (data: OrgRow[]) => {
    const header = ['id', 'name', 'contact_email', 'address', 'timezone', 'created_at', 'updated_at'];
    const lines = [header.join(',')];
    data.forEach(r => {
      lines.push(
        [
          r.id,
          r.name ?? '',
          r.contact_email ?? '',
          r.address ?? '',
          r.timezone ?? '',
          r.created_at ?? '',
          r.updated_at ?? '',
        ]
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      );
    });
    const blob = new Blob([lines.join('\n')], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organizations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = (data: OrgRow[]) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organizations.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    setImportMessage(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error('CSV appears empty');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.indexOf('name');
      const emailIdx = headers.indexOf('contact_email');
      const addressIdx = headers.indexOf('address');
      const tzIdx = headers.indexOf('timezone');
      if (nameIdx === -1 || emailIdx === -1) {
        throw new Error('CSV must include name and contact_email columns');
      }
      let createdCount = 0;
      let errors = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (!cols[nameIdx]) continue;
        const payload: Record<string, unknown> = {
          name: cols[nameIdx],
          contact_email: cols[emailIdx] ?? '',
        };
        if (addressIdx !== -1) payload.address = cols[addressIdx] ?? '';
        if (tzIdx !== -1) payload.timezone = cols[tzIdx] ?? '';
        try {
          await api.createOrganization(payload);
          createdCount++;
        } catch (err: any) {
          errors++;
          continue;
        }
      }
      setImportMessage(`Imported ${createdCount}${errors ? `, ${errors} failed` : ''}`);
      await load();
    } catch (err: any) {
      setImportMessage(err?.message ?? 'Failed to import CSV');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <Card>
        <LoadingState message="Loading organizations..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={load} />
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState message="No organizations found." />
      </Card>
    );
  }

  return (
    <div className="overview">
      <Card>
        <h2>Organizations</h2>
        <div className="filters" style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          <input
            className="input"
            placeholder="Search by name/email/address"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input
            className="input"
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
          <input
            className="input"
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setSearch('');
              setFromDate('');
              setToDate('');
            }}>
            Clear filters
          </button>
        </div>
        <div className="actions">
          <button className="primary" onClick={() => setCreateOpen(true)} disabled={readOnly}>
            + New organization
          </button>
          <button className="secondary" onClick={() => fileInputRef.current?.click()} disabled={readOnly || importing}>
            {importing ? 'Importing�?�' : 'Import CSV'}
          </button>
          <button className="secondary" onClick={() => exportCsv(filteredRows)} disabled={filteredRows.length === 0}>
            Export CSV
          </button>
          <button className="secondary" onClick={() => exportJson(filteredRows)} disabled={filteredRows.length === 0}>
            Export JSON
          </button>
        </div>
        {readOnly ? (
          <div className="muted" style={{marginTop: 4}}>
            This API key cannot list all organizations; showing the current org only. Creating orgs is disabled.
          </div>
        ) : null}
        {importMessage ? <div className="muted" style={{marginTop: 4}}>{importMessage}</div> : null}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{display: 'none'}}
          onChange={e => handleImportFile(e.target.files?.[0] ?? null)}
        />
        {filteredRows.length === 0 ? (
          <EmptyState message="No organizations match the current filters." />
        ) : (
          <DataTable
            data={filteredRows}
            columns={columns}
            getId={row => row.id}
            searchPlaceholder="Search organizations"
            pageSize={10}
            searchable
          />
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New organization">
        <form
          className="form"
          onSubmit={async e => {
            e.preventDefault();
            setCreateErr(null);
            setCreateLoading(true);
            try {
              await api.createOrganization({
                name,
                contact_email: email,
                address,
                timezone,
              });
              setCreateOpen(false);
              setName('');
              setEmail('');
              setAddress('');
              setTimezone('');
              await load();
            } catch (err: any) {
              setCreateErr(err?.message ?? 'Failed to create organization.');
            } finally {
              setCreateLoading(false);
            }
          }}>
          <TextInput label="Name" value={name} onChange={e => setName(e.target.value)} required />
          <TextInput
            label="Contact email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <TextInput
            label="Address"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="123 Main St, City"
          />
          <TextInput
            label="Timezone"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            placeholder="UTC, America/Los_Angeles, etc."
          />
          {createErr ? <div className="form__error">{createErr}</div> : null}
          <SubmitButton loading={createLoading} label="Create" loadingLabel="Creating..." />
        </form>
      </Modal>
    </div>
  );
};

const formatTime = (ts?: string) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

export default OrganizationsPage;
