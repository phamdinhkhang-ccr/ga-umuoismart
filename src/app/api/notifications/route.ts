import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.cloud_store');
const NOTIFS_FILE = path.join(DATA_DIR, 'notifications.json');

function ensureStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {}
}

function readNotifs(): any[] {
  ensureStorage();
  try {
    if (fs.existsSync(NOTIFS_FILE)) {
      const data = fs.readFileSync(NOTIFS_FILE, 'utf-8');
      return data ? JSON.parse(data) : [];
    }
  } catch (e) {}
  return [];
}

function writeNotifs(notifs: any[]) {
  ensureStorage();
  try {
    fs.writeFileSync(NOTIFS_FILE, JSON.stringify(notifs, null, 2), 'utf-8');
  } catch (e) {}
}

export async function GET() {
  try {
    const notifications = readNotifs();
    return NextResponse.json({ success: true, notifications, timestamp: Date.now() });
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

    const current = readNotifs();
    const updated = [newNotif, ...current];
    writeNotifs(updated);

    return NextResponse.json({ success: true, notification: newNotif, notifications: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create cloud notification' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const current = readNotifs();
    let updated = current;

    if (body.markAllRead) {
      updated = current.map(n => ({ ...n, isRead: true, read: true }));
    } else if (body.id) {
      updated = current.map(n => n.id === body.id ? { ...n, isRead: true, read: true } : n);
    }

    writeNotifs(updated);
    return NextResponse.json({ success: true, notifications: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update cloud notification' }, { status: 500 });
  }
}
