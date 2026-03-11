import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ coverageId: string }> }) {
  try {
    const { coverageId } = await params;
    const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
    const auth = request.headers.get('authorization');
    if (auth) hdrs['Authorization'] = auth;
    const org = request.headers.get('x-org-alias');
    if (org) hdrs['X-Org-Alias'] = org;
    const res = await fetch(`${BACKEND_URL}/api/coverages/${coverageId}/archive`, { method: 'PUT', headers: hdrs });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Coverage archive error:', error);
    return NextResponse.json({ success: false, message: 'Failed to archive coverage' }, { status: 500 });
  }
}
