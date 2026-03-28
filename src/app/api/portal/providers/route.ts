import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const hdrs: Record<string, string> = { 'Authorization': authHeader, 'Content-Type': 'application/json' };
    const orgAlias = request.headers.get('x-org-alias');
    if (orgAlias) hdrs['X-Org-Alias'] = orgAlias;
    const tenantName = request.headers.get('x-tenant-name');
    if (tenantName) hdrs['X-Tenant-Name'] = tenantName;

    const response = await fetch(`${BACKEND_URL}/api/portal/providers`, {
      method: 'GET',
      headers: hdrs,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Portal providers GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}