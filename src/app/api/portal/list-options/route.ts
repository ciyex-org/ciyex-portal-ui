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

    // Forward query params (e.g., list_id)
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const targetUrl = queryString
      ? `${BACKEND_URL}/api/portal/list-options?${queryString}`
      : `${BACKEND_URL}/api/portal/list-options`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: hdrs,
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : { success: true, data: { visit_types: [], appointment_priorities: [] } };
    } catch {
      data = { success: false, message: 'Invalid response from backend' };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Portal list-options proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch list options', data: { visit_types: [], appointment_priorities: [] } },
      { status: 500 }
    );
  }
}
