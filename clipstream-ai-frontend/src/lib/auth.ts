// auth.ts
// -------
// Utility functions for password hashing and comparison using bcryptjs.
// Used for securely storing and verifying user passwords in Clipstream AI.

import { hash, compare } from "bcryptjs";

// Hash a plain text password with bcrypt (12 salt rounds)
export async function hashPassword(password: string) {
  return hash(password, 12);
}

// Compare a plain text password with a hashed password
export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string,
) {
  return compare(plainPassword, hashedPassword);
}
