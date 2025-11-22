import React, {useEffect, useState} from 'react';
import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import DataTable, {DataTableColumn} from '../components/DataTable';
import Modal from '../components/Modal';
import TextInput from '../components/form/TextInput';
import SelectInput from '../components/form/SelectInput';
import SubmitButton from '../components/form/SubmitButton';
import {useApi} from '../api/client';
import {useToast} from '../hooks/useToast';

type Member = {
  id: string;
  email?: string;
  role?: string;
  invited_at?: string;
  accepted_at?: string | null;
};

type Props = {
  orgId?: string | number | null;
};

const UsersTab = ({orgId}: Props) => {
  const api = useApi();
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  const load = async (page = 1, perPage = 50) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOrgUsers(orgId as any, {page, perPage});
      const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setMembers(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const validateEmail = (val: string) => /
^\S+@\S+\.\S+$/.test(val);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setInviteLoading(true);
    try {
      await api.inviteOrgUser(inviteEmail, inviteRole, orgId as any);
      toast.success('Invite sent');
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) return (
    <Card>
      <LoadingState message="Loading members..." />
    </Card>
  );

  if (error) return (
    <Card>
      <ErrorState message={error} onRetry={load} />
    </Card>
  );

  const columns: DataTableColumn<Member>[] = [
    {id: 'email', header: 'Email', accessor: m => m.email ?? '—', sortable: true},
    {id: 'role', header: 'Role', field: 'role', sortable: true},
    {id: 'invited_at', header: 'Invited', accessor: m => formatTime(m.invited_at), sortable: true},
    {id: 'accepted_at', header: 'Accepted', accessor: m => m.accepted_at ? new Date(m.accepted_at).toLocaleString() : '—', sortable: true},
  ];

  return (
    <div>
      <Card>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Members</h2>
          <div className="actions">
            <button className="primary" onClick={() => setInviteOpen(true)}>Invite member</button>
          </div>
        </div>

        {members.length === 0 ? (
          <EmptyState message="No members found." />
        ) : (
          <DataTable data={members} columns={columns} getId={m => m.id} pageSize={10} searchable />
        )}
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite member">
        <form className="form" onSubmit={invite}>
          <TextInput label="Email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
          <SelectInput
            label="Role"
            options={[{label: 'Member', value: 'member'}, {label: 'Admin', value: 'admin'}]}
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
          />
          <div style={{marginTop: 8}}>
            <SubmitButton loading={inviteLoading} label="Send invite" />
          </div>
        </form>
      </Modal>
    </div>
  );
};

const formatTime = (ts?: string) => {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  } catch (e) {
    return '—';
  }
};

export default UsersTab;
