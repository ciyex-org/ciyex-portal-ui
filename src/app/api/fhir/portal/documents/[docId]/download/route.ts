import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const hdrs: Record<string, string> = { 'Authorization': authHeader };
    const orgAlias = request.headers.get('x-org-alias');
    if (orgAlias) hdrs['X-Org-Alias'] = orgAlias;

    // Try multiple backend paths — the backend may serve documents at different endpoints
    const paths = [
      `/api/fhir/portal/documents/${docId}/download`,
      `/api/portal/documents/${docId}/download`,
      `/api/documents/${docId}/download`,
      `/api/fhir/documents/${docId}/download`,
    ];

    let response: Response | null = null;
    for (const path of paths) {
      try {
        const res = await fetch(`${BACKEND_URL}${path}`, { method: 'GET', headers: hdrs });
        if (res.ok) {
          response = res;
          break;
        }
        // If not 404, stop trying (could be auth error etc.)
        if (res.status !== 404) {
          response = res;
          break;
        }
      } catch {
        // Network error on this path — try next
      }
    }

    if (!response || !response.ok) {
      const status = response?.status || 404;
      return new NextResponse(
        JSON.stringify({ success: false, message: `Document not found (${status})` }),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the document binary response back to the client
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || '';
    const body = await response.arrayBuffer();

    const headers: Record<string, string> = { 'Content-Type': contentType };
    if (contentDisposition) headers['Content-Disposition'] = contentDisposition;

    return new NextResponse(body, { status: 200, headers });
  } catch (error) {
    console.error('Portal document download proxy error:', error);
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Failed to download document' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
