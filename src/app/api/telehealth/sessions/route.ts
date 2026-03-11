import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

function getHeaders(request: NextRequest): Record<string, string> {
  const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
  const auth = request.headers.get('authorization');
  if (auth) hdrs['Authorization'] = auth;
  const org = request.headers.get('x-org-alias');
  if (org) hdrs['X-Org-Alias'] = org;
  const tenant = request.headers.get('x-tenant-name');
  if (tenant) hdrs['X-Tenant-Name'] = tenant;
  return hdrs;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${BACKEND_URL}/api/telehealth/sessions${queryString ? `?${queryString}` : ''}`;
    const res = await fetch(url, { headers: getHeaders(request) });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Telehealth sessions GET error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch telehealth sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/telehealth/sessions`, { method: 'POST', headers: getHeaders(request), body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Telehealth sessions POST error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create telehealth session' }, { status: 500 });
  }
}
