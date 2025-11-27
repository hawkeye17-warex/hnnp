import React from 'react';
import Modal from './Modal';

type Props = {
  open: boolean;
  onConfirm: () => void;
};

const SessionExpiredModal: React.FC<Props> = ({open, onConfirm}) => {
  return (
    <Modal open={open} onClose={onConfirm} title="Session expired">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Your session has expired. Please sign in again to continue.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            Sign in again
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SessionExpiredModal;
