export type RouteMeta = {
  title: string;
  section?: string;
};

export const routeMeta: Record<string, RouteMeta> = {
  '/overview': {title: 'Overview', section: 'Monitor'},
  '/live': {title: 'Live Presence', section: 'Monitor'},
  '/incidents': {title: 'Incidents', section: 'Monitor'},
  '/attendance': {title: 'Attendance', section: 'People'},
  '/users': {title: 'Users', section: 'People'},
  '/groups': {title: 'Groups & Sessions', section: 'People'},
  '/locations': {title: 'Locations', section: 'Spaces'},
  '/receivers': {title: 'Receivers', section: 'Spaces'},
  '/logs': {title: 'Logs', section: 'System'},
  '/hps': {title: 'HPS & Security', section: 'System'},
  '/integrations': {title: 'API & Integrations', section: 'System'},
  '/settings': {title: 'Settings', section: 'System'},
};

export const resolveRouteMeta = (pathname: string): RouteMeta | undefined => {
  const match = Object.keys(routeMeta)
    .sort((a, b) => b.length - a.length)
    .find(path => pathname.startsWith(path));
  return match ? routeMeta[match] : undefined;
};
