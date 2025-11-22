import React, {useEffect, useState} from 'react';
import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import {useApi} from '../api/client';
import {useToast} from '../hooks/useToast';
import Modal from '../components/Modal';

type KeyInfo = {
  type: string;
  created_at?: string;
  last_rotated_at?: string;
  // backend should NOT return raw key except on creation — handle accordingly
};

type Props = { org?: any };

const ApiKeysTab = ({org}: Props) => {
  const api = useApi();
  const toast = useToast();
  const [keys, setKeys] = useState<KeyInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{type: string; key: string} | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getApiKeys(org?.id);
      // expect array or {data: [...]} — be permissive
      const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setKeys(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load API keys.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | {op: 'generate' | 'rotate'; type: 'ADMIN_KEY' | 'RECEIVER_KEY'}>(null);

  const doGenerate = async (type: 'ADMIN_KEY' | 'RECEIVER_KEY') => {
    setPendingAction({op: 'generate', type});
    setConfirmOpen(true);
  };

  const doRotate = async (type: 'ADMIN_KEY' | 'RECEIVER_KEY') => {
    setPendingAction({op: 'rotate', type});
    setConfirmOpen(true);
  };

  const executePending = async () => {
    if (!pendingAction) return;
    const {op, type} = pendingAction;
    setConfirmOpen(false);
    setBusy(true);
    setGenerated(null);
    try {
      const res = op === 'generate' ? await api.generateApiKey(type, org?.id) : await api.rotateApiKey(type, org?.id);
      const key = (res as any)?.key ?? (res as any)?.secret ?? null;
      if (key) {
        setGenerated({type, key});
        toast.success(`${type} ${op === 'generate' ? 'generated' : 'rotated'} — copy it now`);
      } else {
        toast.success(`${type} ${op === 'generate' ? 'generated' : 'rotated'}`);
      }
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? `Failed to ${op} key`);
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  

  const copy = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      toast.success('Copied to clipboard');
    } catch (e) {
      // fallback
      try {
        // @ts-ignore
        window.prompt('Copy the key (Ctrl+C, Enter):', val);
      } catch {}
    }
  };

  if (loading) {
    return (
      <Card>
        <LoadingState message="Loading API keys..." />
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

  return (
    <div>
      <Card>
        <h2>API Keys</h2>
        <p className="muted">Generate and rotate organization API keys. Keys are shown once on creation.</p>

        <div style={{display: 'flex', gap: 8, marginTop: 8}}>
          <div>
            <p className="muted">Admin key</p>
            <div style={{display: 'flex', gap: 8}}>
              <button className="secondary" onClick={() => doGenerate('ADMIN_KEY')} disabled={busy}>
                {busy ? 'Working…' : 'Generate ADMIN_KEY'}
              </button>
              <button className="secondary" onClick={() => doRotate('ADMIN_KEY')} disabled={busy}>
                {busy ? 'Working…' : 'Rotate ADMIN_KEY'}
              </button>
            </div>
          </div>

          <div>
            <p className="muted">Receiver key</p>
            <div style={{display: 'flex', gap: 8}}>
              <button className="secondary" onClick={() => doGenerate('RECEIVER_KEY')} disabled={busy}>
                {busy ? 'Working…' : 'Generate RECEIVER_KEY'}
              </button>
              <button className="secondary" onClick={() => doRotate('RECEIVER_KEY')} disabled={busy}>
                {busy ? 'Working…' : 'Rotate RECEIVER_KEY'}
              </button>
            </div>
          </div>
        </div>

        <div style={{marginTop: 12}}>
          <h4>Key metadata</h4>
          {(!keys || keys.length === 0) && <div className="muted">No key metadata available.</div>}
          {keys && keys.length > 0 && (
            <div className="table">
              <div className="table__row table__head">
                <div>Type</div>
                <div>Created</div>
                <div>Last rotated</div>
              </div>
              {keys.map(k => (
                <div className="table__row" key={k.type}>
                  <div>{k.type}</div>
                  <div>{k.created_at ? new Date(k.created_at).toLocaleString() : '—'}</div>
                  <div>{(k as any).last_rotated_at ? new Date((k as any).last_rotated_at).toLocaleString() : '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {generated ? (
          <div style={{marginTop: 12}}>
            <h4>Newly generated key ({generated.type})</h4>
            <div className="code-block" style={{display: 'flex', gap: 8, alignItems: 'center'}}>
              <code style={{whiteSpace: 'break-spaces'}}>{generated.key}</code>
              <button className="secondary" onClick={() => copy(generated.key)}>Copy</button>
            </div>
            <div className="muted" style={{fontSize: 12, marginTop: 8}}>
              This key will not be shown again. Store it securely.
            </div>
          </div>
        ) : null}
        <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm key action">
          <div>
            <p>Are you sure you want to {pendingAction?.op} the key {pendingAction?.type}?</p>
            <div style={{display: 'flex', gap: 8}}>
              <button className="secondary" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="primary" onClick={executePending} disabled={busy}>{busy ? 'Working…' : 'Confirm'}</button>
            </div>
          </div>
        </Modal>
      </Card>
    </div>
  );
};

export default ApiKeysTab;
