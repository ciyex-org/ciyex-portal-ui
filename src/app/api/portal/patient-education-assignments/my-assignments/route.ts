import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
    const auth = request.headers.get('authorization');
    if (auth) hdrs['Authorization'] = auth;
    const org = request.headers.get('x-org-alias');
    if (org) hdrs['X-Org-Alias'] = org;
    const res = await fetch(`${BACKEND_URL}/api/portal/patient-education-assignments/my-assignments`, { headers: hdrs });
    const data = await res.json().catch(() => ({ success: true, data: [] }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Education assignments GET error:', error);
    return NextResponse.json({ success: true, data: [] }, { status: 200 });
  }
}
