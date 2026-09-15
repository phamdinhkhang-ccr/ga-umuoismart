import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper to remove accents and convert to uppercase for bank account name
function sanitizeAccountName(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .trim();
}

const DEFAULT_CONFIG = {
  id: 'default',
  bankId: 'MB',
  bankName: 'MBBank (Ngân hàng Quân Đội)',
  accountNumber: '0988888888',
  accountName: 'NGUYEN VAN KHANG',
  qrTemplate: 'compact2',
  transferSyntax: 'GUM [Mã_Đơn]',
  note: 'Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động kích hoạt đơn giao hỏa tốc.'
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let branchId = searchParams.get('branchId');

    // If branchId is not passed or empty, lookup first active branch or branch with code 'cs1'
    if (!branchId) {
      const firstBranch = await prisma.branch.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      });
      if (firstBranch) {
        branchId = firstBranch.id;
      }
    }

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'Chưa có cơ sở nào trong hệ thống' },
        { status: 404 }
      );
    }

    // Try to find branch by ID or Code
    let targetBranch = await prisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!targetBranch) {
      targetBranch = await prisma.branch.findUnique({
        where: { code: branchId }
      });
    }

    if (!targetBranch) {
      const fallbackBranch = await prisma.branch.findFirst({ orderBy: { sortOrder: 'asc' } });
      if (fallbackBranch) {
        targetBranch = fallbackBranch;
      } else {
        return NextResponse.json(
          { success: false, error: 'Không tìm thấy cơ sở phù hợp' },
          { status: 404 }
        );
      }
    }

    const actualBranchId = targetBranch.id;

    let config = await prisma.paymentConfig.findUnique({
      where: { branchId: actualBranchId }
    });

    if (!config) {
      config = await prisma.paymentConfig.create({
        data: {
          branchId: actualBranchId,
          bankId: 'MB',
          bankName: 'MBBank (Ngân hàng Quân Đội)',
          accountNumber: '0988888888',
          accountName: 'NGUYEN VAN KHANG',
          qrTemplate: 'compact2',
          transferSyntax: 'GUM [Mã_Đơn]',
          note: 'Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động kích hoạt đơn.',
          isAutoConfirm: false,
        }
      });
    }

    return NextResponse.json({
      success: true,
      config,
      branch: targetBranch
    });
  } catch (error: any) {
    console.error('Error fetching payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể tải cấu hình thanh toán' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      branchId,
      bankId,
      bankName,
      accountNumber,
      accountName,
      qrTemplate,
      transferSyntax,
      note,
      web2mToken,
      web2mPassword,
      isAutoConfirm,
    } = body;

    if (!branchId || !bankId || !accountNumber || !accountName) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng chọn cơ sở và điền đầy đủ Ngân hàng, STK và Tên chủ tài khoản!' },
        { status: 400 }
      );
    }

    // Resolve target branch by id or code
    let targetBranch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!targetBranch) {
      targetBranch = await prisma.branch.findUnique({ where: { code: branchId } });
    }

    if (!targetBranch) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy cơ sở cần lưu cấu hình!' },
        { status: 404 }
      );
    }

    const actualBranchId = targetBranch.id;
    const cleanAccountName = sanitizeAccountName(accountName);

    const updatedConfig = await prisma.paymentConfig.upsert({
      where: { branchId: actualBranchId },
      update: {
        bankId: bankId.trim(),
        bankName: bankName?.trim() || bankId.trim(),
        accountNumber: accountNumber.trim(),
        accountName: cleanAccountName,
        qrTemplate: qrTemplate || 'compact2',
        transferSyntax: transferSyntax?.trim() || 'GUM [Mã_Đơn]',
        note: note || '',
        web2mToken: web2mToken || null,
        web2mPassword: web2mPassword || null,
        isAutoConfirm: Boolean(isAutoConfirm),
      },
      create: {
        branchId: actualBranchId,
        bankId: bankId.trim(),
        bankName: bankName?.trim() || bankId.trim(),
        accountNumber: accountNumber.trim(),
        accountName: cleanAccountName,
        qrTemplate: qrTemplate || 'compact2',
        transferSyntax: transferSyntax?.trim() || 'GUM [Mã_Đơn]',
        note: note || '',
        web2mToken: web2mToken || null,
        web2mPassword: web2mPassword || null,
        isAutoConfirm: Boolean(isAutoConfirm),
      }
    });

    return NextResponse.json({
      success: true,
      message: `Đã lưu & áp dụng cấu hình thanh toán cho cơ sở "${targetBranch.name}"!`,
      config: updatedConfig
    });
  } catch (error: any) {
    console.error('Error updating payment config:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lưu cấu hình thanh toán: ' + error.message },
      { status: 500 }
    );
  }
}
