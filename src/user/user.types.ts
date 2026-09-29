export enum UserRole {
  /** Seeded once from SUPER_ADMIN_* env; passes every role check; never assignable via the API. */
  SuperAdmin = 'super_admin',
  Admin = 'admin',
  Hr = 'hr',
  Manager = 'manager',
  Employee = 'employee',
}

/** Roles that can be given out through PATCH /users/:id/role. */
export const ASSIGNABLE_ROLES: readonly UserRole[] = Object.values(
  UserRole,
).filter((role) => role !== UserRole.SuperAdmin);
