import {HistoryEvent} from '../types/history';

export const getPresenceHistory = async (): Promise<HistoryEvent[]> => {
  // Mocked API response
  return Promise.resolve([
    {
      id: '1',
      place: 'Building A - Lab 3',
      time: '10:12',
      status: 'verified',
      note: 'Routine check-in',
    },
    {
      id: '2',
      place: 'Building B - Lobby',
      time: '08:47',
      status: 'verified',
    },
    {
      id: '3',
      place: 'Annex - Server Room',
      time: 'Yesterday 18:03',
      status: 'error',
      note: 'Signal lost',
    },
    {id: '4', place: 'HQ - Atrium', time: 'Tue 11:15', status: 'verified'},
    {id: '5', place: 'HQ - Loading Dock', time: 'Mon 09:10', status: 'verified'},
    {id: '6', place: 'Parking Garage', time: 'Jan 12, 14:22', status: 'verified'},
  ]);
};

export const exportHistory = async (): Promise<void> => {
  // Mock export (pretend to write or share a file)
  return Promise.resolve();
};

export const deleteAccount = async (): Promise<void> => {
  // Mock account deletion
  return Promise.resolve();
};

export default {
  getPresenceHistory,
  exportHistory,
  deleteAccount,
};
