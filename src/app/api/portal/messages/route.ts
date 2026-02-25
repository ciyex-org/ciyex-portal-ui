import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header required' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/portal/communications/my`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Portal messages GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Handle new thread creation
    const formData = await request.formData();
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;
    const category = formData.get('category') as string || 'general';
    const priority = formData.get('priority') as string || 'normal';
    const providerId = formData.get('providerId') as string;

    // Validate required fields
    if (!subject || !message || !providerId) {
      return NextResponse.json(
        { success: false, message: 'Subject, message, and providerId are required' },
        { status: 400 }
      );
    }

    // For development, just return success with the provided data
    // In production, this would create a new thread in the backend
    const newThreadId = Date.now();

    return NextResponse.json({
      success: true,
      threadId: newThreadId,
      message: 'Message sent successfully',
      data: {
        subject,
        message,
        category,
        priority,
        providerId: parseInt(providerId)
      }
    });
  } catch (error) {
    console.error('Portal messages POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}