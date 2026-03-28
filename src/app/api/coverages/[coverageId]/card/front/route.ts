import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest, { params }: { params: Promise<{ coverageId: string }> }) {
  try {
    const { coverageId } = await params;
    const hdrs: Record<string, string> = {};
    const auth = request.headers.get('authorization');
    if (auth) hdrs['Authorization'] = auth;
    const org = request.headers.get('x-org-alias');
    if (org) hdrs['X-Org-Alias'] = org;
    const body = await request.arrayBuffer();
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    hdrs['Content-Type'] = contentType;
    const res = await fetch(`${BACKEND_URL}/api/coverages/${coverageId}/card/front`, { method: 'POST', headers: hdrs, body });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Card front upload error:', error);
    return NextResponse.json({ success: false, message: 'Failed to upload card' }, { status: 500 });
  }
}
