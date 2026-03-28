import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

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

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const targetUrl = `${BACKEND_URL}/api/portal/appointments/available-slots?${queryString}`;

    const response = await fetch(targetUrl, { method: 'GET', headers: hdrs });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Available slots proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch available slots', data: [] },
      { status: 500 }
    );
  }
}
