import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

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
    const response = await fetch(
      `${BACKEND_URL}/api/channels/${channelId}/read`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth,
        },
      }
    );
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return new NextResponse(null, { status: 204 });
    }
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Channel read POST error:', error);
    return new NextResponse(null, { status: 204 });
  }
}
