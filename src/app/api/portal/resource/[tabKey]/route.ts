import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest, { params }: { params: Promise<{ tabKey: string }> }) {
  try {
    const { tabKey } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Authorization header missing' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/portal/resource/${tabKey}`, {
      method: 'GET',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
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
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Portal resource PUT error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update resource' }, { status: 500 });
  }
}
