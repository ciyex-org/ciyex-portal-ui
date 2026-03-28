import { getEnv } from "@/utils/env";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { listId } = await params;

  try {
    const backendUrl = getEnv("NEXT_PUBLIC_BACKEND_URL") || 'http://localhost:8080';
    const token = request.headers.get('authorization');

    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const response = await fetch(`${backendUrl}/api/portal/list-options/list/${listId}`, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: 'Invalid response from backend' };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}