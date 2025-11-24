import React, {useEffect, useMemo, useState} from 'react';

import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import Modal from '../components/Modal';
import TextInput from '../components/form/TextInput';
import SubmitButton from '../components/form/SubmitButton';
import {useApi} from '../api/client';

type AdminUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

const emptyForm = {id: '', email: '', name: '', role: 'admin', status: 'active'};

const AdminUsersPage = () => {
  const api = useApi();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminUsers();
      const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setUsers(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load admin users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u => {
      return (
        u.email.toLowerCase().includes(term) ||
        (u.name ?? '').toLowerCase().includes(term) ||
        (u.role ?? '').toLowerCase().includes(term) ||
        u.id.toLowerCase().includes(term)
      );
    });
  }, [users, search]);

  const openCreate = () => {
    setForm(emptyForm);
    setSavingError(null);
    setModalOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setForm({
      id: user.id,
      email: user.email,
      name: user.name ?? '',
      role: user.role ?? 'admin',
      status: user.status ?? 'active',
    });
    setSavingError(null);
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavingError(null);
    try {
      if (form.id) {
        await api.updateAdminUser(form.id, {
          email: form.email,
          name: form.name,
          role: form.role,
          status: form.status,
        });
      } else {
        await api.createAdminUser({
          email: form.email,
          name: form.name,
          role: form.role,
          status: form.status,
        });
      }
      setModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      setSavingError(err?.message ?? 'Failed to save admin user.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this admin user?')) return;
    try {
      await api.deleteAdminUser(id);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete admin user.');
    }
  };

  const renderTable = () => {
    if (loading) return <LoadingState message="Loading admin users..." />;
    if (error) return <ErrorState message={error} onRetry={load} />;
    if (filtered.length === 0) return <EmptyState message="No admin users found." />;
    return (
      <div className="table">
        <div className="table__row table__head">
          <div>Email</div>
          <div>Name</div>
          <div>Role</div>
          <div>Status</div>
          <div>Created</div>
          <div />
        </div>
        {filtered.map(u => (
          <div className="table__row" key={u.id}>
            <div>{u.email}</div>
            <div>{u.name || '—'}</div>
            <div>{u.role || '—'}</div>
            <div>
              <span className="badge">{u.status || '—'}</span>
            </div>
            <div className="muted">{formatDate(u.created_at)}</div>
            <div className="table__actions">
              <button className="secondary" type="button" onClick={() => openEdit(u)}>
                Edit
              </button>
              <button className="secondary" type="button" onClick={() => remove(u.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="overview">
      <Card>
        <div className="table__header">
          <div>
            <h2>Admin Users</h2>
            <p className="muted">Manage console administrator accounts.</p>
          </div>
          <div className="actions" style={{gap: 8}}>
            <input
              className="input"
              placeholder="Search email, name, or role"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="secondary" type="button" onClick={() => setSearch('')}>
              Clear
            </button>
            <button className="primary" type="button" onClick={openCreate}>
              + New admin
            </button>
          </div>
        </div>
        {renderTable()}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Edit admin user' : 'New admin user'}>
        <form className="form" onSubmit={save}>
          <TextInput
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
          />
          <TextInput
            label="Name"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            placeholder="Optional"
          />
          <TextInput
            label="Role"
            value={form.role}
            onChange={e => setForm({...form, role: e.target.value})}
            placeholder="admin"
          />
          <TextInput
            label="Status"
            value={form.status}
            onChange={e => setForm({...form, status: e.target.value})}
            placeholder="active | suspended"
          />
          {savingError ? <div className="form__error">{savingError}</div> : null}
          <SubmitButton loading={saving} label={form.id ? 'Save changes' : 'Create admin'} loadingLabel="Saving..." />
        </form>
      </Modal>
    </div>
  );
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

export default AdminUsersPage;
