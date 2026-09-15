import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly');

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const items = await prisma.aIKnowledge.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('Error fetching AI knowledge:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, question, answer, isActive, priority } = body;

    if (!answer || !answer.trim()) {
      return NextResponse.json({ success: false, error: 'Nội dung câu trả lời / tri thức là bắt buộc' }, { status: 400 });
    }

    const newItem = await prisma.aIKnowledge.create({
      data: {
        category: category || 'GENERAL',
        question: question ? question.trim() : null,
        answer: answer.trim(),
        isActive: isActive !== false,
        priority: Number(priority) || 0,
      },
    });

    return NextResponse.json({ success: true, item: newItem, message: 'Đã thêm tri thức mới thành công!' });
  } catch (error: any) {
    console.error('Error creating AI knowledge:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
