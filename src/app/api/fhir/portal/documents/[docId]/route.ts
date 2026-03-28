import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  try {
    const { docId } = await params;
    const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
    const auth = request.headers.get('authorization');
    if (auth) hdrs['Authorization'] = auth;
    const org = request.headers.get('x-org-alias');
    if (org) hdrs['X-Org-Alias'] = org;
    const res = await fetch(`${BACKEND_URL}/api/fhir/portal/documents/${docId}`, { method: 'DELETE', headers: hdrs });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete document' }, { status: 500 });
  }
}
