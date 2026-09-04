import { NextResponse } from 'next/server';
import { getCloudNotifs, addCloudNotif, setCloudNotifs } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const notifications = getCloudNotifs();
    return NextResponse.json({ success: true, notifications, timestamp: Date.now() }, {
      headers: {
        'Cache-Control': 'no-store, no-cache',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch cloud notifications' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newNotif = {
      id: body.id || `notif_${Date.now()}`,
      type: body.type || 'ORDER',
      title: body.title || 'Thông báo mới',
      content: body.content || body.message || '',
      message: body.message || body.content || '',
      time: body.time || body.timestamp || 'Vừa xong',
      timestamp: body.timestamp || body.time || 'Vừa xong',
      createdAt: new Date().toISOString(),
      isRead: false,
      read: false,
      link: body.link || '/admin/orders'
    };

    const updated = addCloudNotif(newNotif);

    return NextResponse.json({ success: true, notification: newNotif, notifications: updated }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create cloud notification' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const current = getCloudNotifs();
    let updated = current;

    if (body.markAllRead) {
      updated = current.map(n => ({ ...n, isRead: true, read: true }));
    } else if (body.id) {
      updated = current.map(n => n.id === body.id ? { ...n, isRead: true, read: true } : n);
    }

    setCloudNotifs(updated);
    return NextResponse.json({ success: true, notifications: updated }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update cloud notification' }, { status: 500 });
  }
}
