import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

function buildProxyHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const auth = request.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  const orgAlias = request.headers.get('x-org-alias');
  if (orgAlias) headers['X-Org-Alias'] = orgAlias;
  const tenantName = request.headers.get('x-tenant-name');
  if (tenantName) headers['X-Tenant-Name'] = tenantName;
  return headers;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ tabKey: string }> }) {
  try {
    const { tabKey } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Authorization header missing' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/portal/resource/${tabKey}`, {
      method: 'GET',
      headers: buildProxyHeaders(request),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Portal resource GET error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch resource' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ tabKey: string }> }) {
  try {
    const { tabKey } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Authorization header missing' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/portal/resource/${tabKey}`, {
      method: 'PUT',
      headers: buildProxyHeaders(request),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Portal resource PUT error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update resource' }, { status: 500 });
  }
}
