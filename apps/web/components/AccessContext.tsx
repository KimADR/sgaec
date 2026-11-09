'use client';

import { createContext, useContext } from 'react';

type ActiveCommune = { id: string; code: string; name: string };
type AccessValue = { permissions: ReadonlySet<string>; commune: ActiveCommune | null };

const AccessContext = createContext<AccessValue>({
  permissions: new Set<string>(),
  commune: null,
});

export function AccessProvider({ permissions, commune, children }: {
  permissions: string[];
  commune: ActiveCommune | null;
  children: React.ReactNode;
}) {
  return <AccessContext.Provider value={{ permissions: new Set(permissions), commune }}>
    {children}
  </AccessContext.Provider>;
}

export function useCan(permission: string) {
  return useContext(AccessContext).permissions.has(permission);
}

export function useActiveCommune() {
  return useContext(AccessContext).commune;
}
