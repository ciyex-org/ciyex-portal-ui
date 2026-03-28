import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const auth = request.headers.get('authorization');
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Authorization required' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';
    const response = await fetch(
      `${BACKEND_URL}/api/channels/${channelId}/messages?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth,
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Channel messages GET error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch messages', data: [] }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const auth = request.headers.get('authorization');
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Authorization required' }, { status: 401 });
    }
    const body = await request.json();
    const response = await fetch(
      `${BACKEND_URL}/api/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth,
        },
        body: JSON.stringify(body),
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Channel messages POST error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send message' }, { status: 500 });
  }
}
