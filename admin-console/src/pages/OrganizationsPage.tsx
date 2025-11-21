import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
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
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOrganizations();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setRows(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load organizations.');
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
      {id: 'name', header: 'Name', field: 'name', sortable: true},
      {id: 'address', header: 'Address', field: 'address', sortable: true},
      {id: 'contact_email', header: 'Contact Email', field: 'contact_email', sortable: true},
      {id: 'timezone', header: 'Timezone', field: 'timezone', sortable: true},
      {id: 'created_at', header: 'Created', accessor: row => formatTime(row.created_at), sortable: true},
      {id: 'updated_at', header: 'Updated', accessor: row => formatTime(row.updated_at), sortable: true},
    ],
    [],
  );

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
        <div className="actions">
          <button className="primary" onClick={() => setCreateOpen(true)}>
            + New organization
          </button>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          getId={row => row.id}
          searchPlaceholder="Search organizations"
          pageSize={10}
          searchable
        />
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
