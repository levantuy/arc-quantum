import { NextResponse } from 'next/server';
import { getAdminFromSessionCookie } from './admin-auth';

export async function requireAdminOrUnauthorized() {
  const admin = await getAdminFromSessionCookie();

  if (!admin) {
    return {
      admin: null,
      unauthorizedResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return {
    admin,
    unauthorizedResponse: null,
  };
}
