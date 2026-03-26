import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

function forwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const auth = request.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  const orgAlias = request.headers.get('x-org-alias');
  if (orgAlias) headers['X-Org-Alias'] = orgAlias;
  const tenantName = request.headers.get('x-tenant-name');
  if (tenantName) headers['X-Tenant-Name'] = tenantName;
  return headers;
}

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Authorization required' }, { status: 401 });
    }
    const response = await fetch(`${BACKEND_URL}/api/channels`, {
      method: 'GET',
      headers: forwardHeaders(request),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: false, message: 'Empty response', data: [] };
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Channels GET error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch channels', data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Authorization required' }, { status: 401 });
    }
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/channels`, {
      method: 'POST',
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Channels POST error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create channel' }, { status: 500 });
  }
}
