import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
    const auth = request.headers.get('authorization');
    if (auth) hdrs['Authorization'] = auth;
    const org = request.headers.get('x-org-alias');
    if (org) hdrs['X-Org-Alias'] = org;
    const tenant = request.headers.get('x-tenant-name');
    if (tenant) hdrs['X-Tenant-Name'] = tenant;
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/telehealth/sessions/from-appointment`, { method: 'POST', headers: hdrs, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Telehealth from-appointment error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create telehealth session' }, { status: 500 });
  }
}
