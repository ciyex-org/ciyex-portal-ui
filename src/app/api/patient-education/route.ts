import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
    const auth = request.headers.get('authorization');
    if (auth) hdrs['Authorization'] = auth;
    const org = request.headers.get('x-org-alias');
    if (org) hdrs['X-Org-Alias'] = org;
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const res = await fetch(`${BACKEND_URL}/api/patient-education${qs ? `?${qs}` : ''}`, { headers: hdrs });
    const data = await res.json().catch(() => ({ success: true, data: { content: [] } }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Patient education GET error:', error);
    return NextResponse.json({ success: true, data: { content: [] } }, { status: 200 });
  }
}
