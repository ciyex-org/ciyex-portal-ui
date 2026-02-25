import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Authorization required' }, { status: 401 });
    }
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/channels/dm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Channels DM POST error:', error);
    return NextResponse.json({ success: false, message: 'Failed to start DM' }, { status: 500 });
  }
}
