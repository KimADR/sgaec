/**
 * Permission-aware territorial scopes.
 * A role grants access only in its assigned centre unless it is commune-wide.
 */
export function buildTerritorialAccess(assignments, activeCentreIds) {
  const active = new Set(activeCentreIds);
  const byPermission = new Map();
  const validAssignments = assignments.filter((assignment) =>
    !assignment.centreEtatCivilId || active.has(assignment.centreEtatCivilId));

  for (const assignment of validAssignments) {
    for (const rolePermission of assignment.role.permissions) {
      const code = rolePermission.permission.code;
      let scope = byPermission.get(code);
      if (!scope) {
        scope = { communeWide: false, centreIds: new Set() };
        byPermission.set(code, scope);
      }
      if (assignment.centreEtatCivilId) {
        scope.centreIds.add(assignment.centreEtatCivilId);
      } else {
        scope.communeWide = true;
      }
    }
  }

  function scopeFor(codes, mode = 'all') {
    const required = Array.isArray(codes) ? codes : [codes];
    if (!required.length || !['all', 'any'].includes(mode)) {
      throw new Error('Portée de permission invalide');
    }
    const scopes = required.map((code) => byPermission.get(code));
    if (mode === 'all' && scopes.some((scope) => !scope)) {
      return { permitted: false, communeWide: false, centreIds: [] };
    }
    const present = scopes.filter(Boolean);
    if (!present.length) {
      return { permitted: false, communeWide: false, centreIds: [] };
    }
    if (mode === 'any') {
      if (present.some((scope) => scope.communeWide)) {
        return { permitted: true, communeWide: true, centreIds: [] };
      }
      const centreIds = [...new Set(present.flatMap((scope) => [...scope.centreIds]))];
      return { permitted: centreIds.length > 0, communeWide: false, centreIds };
    }
    const restrictions = present.filter((scope) => !scope.communeWide);
    if (!restrictions.length) {
      return { permitted: true, communeWide: true, centreIds: [] };
    }
    const centreIds = [...restrictions[0].centreIds].filter((id) =>
      restrictions.every((scope) => scope.centreIds.has(id)));
    return { permitted: centreIds.length > 0, communeWide: false, centreIds };
  }

  return {
    validAssignments,
    permissions: new Set(byPermission.keys()),
    scopeFor,
  };
}
