// Single source of truth for roles in the GSD app.
// Roles: manager (full dashboard) | agent (own tasks only)

export const ROLE_HIERARCHY = {
  manager: 2,
  agent:   1,
};

const VALID_ROLES = new Set(Object.keys(ROLE_HIERARCHY));

// Manager emails — these users are promoted on first sign-in
export const MANAGER_EMAILS = [
  "daniel.glover-silk@holidayextras.com",
  "natalie.slater@holidayextras.com",
];

export function getUserRole(role) {
  if (typeof role === "string" && VALID_ROLES.has(role)) return role;
  return "agent";
}

export function isManager(user) {
  return getUserRole(user?.role) === "manager";
}

export function hasMinRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}
