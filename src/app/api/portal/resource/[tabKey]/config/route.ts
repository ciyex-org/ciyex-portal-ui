import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest, { params }: { params: Promise<{ tabKey: string }> }) {
  try {
    const { tabKey } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Authorization header missing' }, { status: 401 });
    }

    const proxyHeaders: Record<string, string> = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };
    const orgAlias = request.headers.get('x-org-alias');
    if (orgAlias) proxyHeaders['X-Org-Alias'] = orgAlias;
    const tenantName = request.headers.get('x-tenant-name');
    if (tenantName) proxyHeaders['X-Tenant-Name'] = tenantName;

    const response = await fetch(`${BACKEND_URL}/api/portal/resource/${tabKey}/config`, {
      method: 'GET',
      headers: proxyHeaders,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Portal resource config GET error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch config' }, { status: 500 });
  }
}
