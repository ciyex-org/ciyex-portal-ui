import { NextRequest, NextResponse } from 'next/server';

// Mock data for development - replace with actual backend calls
const mockMessages = [
  {
    id: 1,
    threadId: 1,
    subject: "Follow-up on your recent appointment",
    body: "Hello John, I wanted to follow up on your recent appointment. How are you feeling?",
    from: "Dr. Sarah Johnson",
    to: "You",
    date: "2025-10-15T10:30:00Z",
    isRead: false,
    category: "appointment",
    priority: "normal",
    attachments: [],
    providerName: "Dr. Sarah Johnson",
    providerSpecialty: "Family Medicine",
    providerId: 1
  },
  {
    id: 2,
    threadId: 1,
    subject: "Follow-up on your recent appointment",
    body: "Thank you for asking, Doctor. I'm feeling much better now.",
    from: "You",
    to: "Dr. Sarah Johnson",
    date: "2025-10-15T11:00:00Z",
    isRead: true,
    category: "appointment",
    priority: "normal",
    attachments: [],
    providerName: "Dr. Sarah Johnson",
    providerSpecialty: "Family Medicine",
    providerId: 1
  },
  {
    id: 3,
    threadId: 2,
    subject: "Prescription refill request",
    body: "Your prescription for Lisinopril is ready for refill. Please let us know if you'd like to pick it up or have it delivered.",
    from: "Ciyex Pharmacy",
    to: "You",
    date: "2025-10-14T14:20:00Z",
    isRead: false,
    category: "prescription",
    priority: "normal",
    attachments: [],
    providerName: "Ciyex Pharmacy",
    providerSpecialty: "Pharmacy",
    providerId: 2
  }
];

export async function GET() {
  try {
    // For development, return mock data
    // In production, this would proxy to the backend
    return NextResponse.json({
      success: true,
      messages: mockMessages
    });
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