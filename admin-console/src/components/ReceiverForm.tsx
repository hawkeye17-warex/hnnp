import React, {useMemo, useState} from 'react';

export type ReceiverFormValues = {
  receiver_id: string;
  display_name: string;
  location_label: string;
  org_id?: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  auth_mode: 'hmac_shared_secret' | 'public_key';
  shared_secret?: string;
  public_key_pem?: string;
};

type ReceiverFormProps = {
  initialValues?: Partial<ReceiverFormValues>;
  onSubmit: (values: ReceiverFormValues) => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
};

const ReceiverForm = ({initialValues, onSubmit, onCancel, loading, error}: ReceiverFormProps) => {
  const [values, setValues] = useState<ReceiverFormValues>({
    receiver_id: '',
    display_name: '',
    location_label: '',
    org_id: '',
    description: '',
    latitude: '',
    longitude: '',
    auth_mode: 'hmac_shared_secret',
    shared_secret: '',
    public_key_pem: '',
    ...initialValues,
  });

  const isPublicKey = useMemo(() => values.auth_mode === 'public_key', [values.auth_mode]);

  const handleChange = (key: keyof ReceiverFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValues(prev => ({...prev, [key]: e.target.value}));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(values);
  };

  return (
    <form className="form" onSubmit={submit}>
      <label className="form__field">
        <span>Receiver ID</span>
        <input
          required
          value={values.receiver_id}
          onChange={handleChange('receiver_id')}
          placeholder="receiver_123"
        />
      </label>
      <label className="form__field">
        <span>Display name</span>
        <input
          required
          value={values.display_name}
          onChange={handleChange('display_name')}
          placeholder="Lobby Receiver"
        />
      </label>
      <label className="form__field">
        <span>Location label</span>
        <input
          required
          value={values.location_label}
          onChange={handleChange('location_label')}
          placeholder="HQ / Lobby"
        />
      </label>
      <label className="form__field">
        <span>Organization ID (optional)</span>
        <input
          value={values.org_id ?? ''}
          onChange={handleChange('org_id')}
          placeholder="org_123"
        />
      </label>
      <label className="form__field">
        <span>Description (optional)</span>
        <textarea
          rows={3}
          value={values.description ?? ''}
          onChange={handleChange('description')}
          placeholder="Notes or description for this receiver"
        />
      </label>
      <div className="form__row">
        <label className="form__field">
          <span>Latitude (optional)</span>
          <input
            value={values.latitude ?? ''}
            onChange={handleChange('latitude')}
            placeholder="40.7128"
          />
        </label>
        <label className="form__field">
          <span>Longitude (optional)</span>
          <input
            value={values.longitude ?? ''}
            onChange={handleChange('longitude')}
            placeholder="-74.0060"
          />
        </label>
      </div>
      <label className="form__field">
        <span>Auth mode</span>
        <select value={values.auth_mode} onChange={handleChange('auth_mode')}>
          <option value="hmac_shared_secret">HMAC Shared Secret</option>
          <option value="public_key">Public Key</option>
        </select>
      </label>
      {isPublicKey ? (
        <label className="form__field">
          <span>Public Key (PEM)</span>
          <textarea
            rows={4}
            required
            value={values.public_key_pem ?? ''}
            onChange={handleChange('public_key_pem')}
            placeholder="-----BEGIN PUBLIC KEY-----"
          />
        </label>
      ) : (
        <label className="form__field">
          <span>Shared Secret</span>
          <input
            type="password"
            required
            value={values.shared_secret ?? ''}
            onChange={handleChange('shared_secret')}
            placeholder="Super secret"
          />
        </label>
      )}
      {error ? <div className="form__error">{error}</div> : null}
      <div className="form__actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

export default ReceiverForm;
