import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

function buildProxyHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const auth = request.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  const orgAlias = request.headers.get('x-org-alias');
  if (orgAlias) headers['X-Org-Alias'] = orgAlias;
  const tenantName = request.headers.get('x-tenant-name');
  if (tenantName) headers['X-Tenant-Name'] = tenantName;
  const contentType = request.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;
  if (!contentType) headers['Content-Type'] = 'application/json';
  return headers;
}

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    const pathStr = `/api/${path.join('/')}`;
    const search = request.nextUrl.search || '';
    const targetUrl = `${BACKEND_URL}${pathStr}${search}`;

    const isFormData = request.headers.get('content-type')?.includes('multipart/form-data');
    const hdrs = buildProxyHeaders(request);
    if (isFormData) delete hdrs['Content-Type'];

    const fetchOptions: RequestInit = {
      method: request.method,
      headers: hdrs,
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      if (isFormData) {
        fetchOptions.body = await request.arrayBuffer();
      } else {
        try {
          const body = await request.text();
          if (body) fetchOptions.body = body;
        } catch {
          // no body
        }
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    const responseContentType = response.headers.get('content-type') || '';

    // For binary responses (files, images, PDFs), stream back directly
    if (!responseContentType.includes('application/json') && !responseContentType.includes('text/')) {
      const body = await response.arrayBuffer();
      const resHeaders: Record<string, string> = { 'Content-Type': responseContentType };
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) resHeaders['Content-Disposition'] = contentDisposition;
      return new NextResponse(body, { status: response.status, headers: resHeaders });
    }

    // For JSON/text responses
    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': responseContentType || 'application/json' },
    });
  } catch (error) {
    console.error('Catch-all proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Proxy request failed' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, ctx);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, ctx);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, ctx);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, ctx);
}
