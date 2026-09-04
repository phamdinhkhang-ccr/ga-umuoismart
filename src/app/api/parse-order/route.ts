import { NextRequest, NextResponse } from 'next/server';
import { getBranches, getMenuItems, getVoucherByCode } from '@/actions/orders';
import { parseOrderWithAI } from '@/lib/ai';
import { assignBranch } from '@/lib/routing';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { raw_text } = body;

    if (!raw_text || typeof raw_text !== 'string' || raw_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp nội dung tin nhắn của khách hàng' },
        { status: 400 }
      );
    }

    // 1. Load active menu items & branches
    const menuItems = await getMenuItems();
    const branches = await getBranches();
    const menuItemNames = menuItems.map(m => m.name);

    // 2. Process message using LLM AI / Resilient Regex Natural Language Parser
    const parsedData = await parseOrderWithAI(raw_text, menuItemNames);

    // 3. Routing Engine: Auto-match branch based on district/address/city
    const matchedBranch = assignBranch(
      parsedData.district,
      parsedData.shipping_address,
      branches,
      parsedData.city
    );

    // 4. Map extracted items to database menu items & calculate preliminary pricing
    let subtotal = 0;
    let totalCost = 0;

    const processedItems = parsedData.items.map(parsedItem => {
      // Find matching menu item by fuzzy name search
      const matchedMenu = menuItems.find(m => 
        m.name.toLowerCase().includes(parsedItem.item_name.toLowerCase()) ||
        parsedItem.item_name.toLowerCase().includes(m.name.toLowerCase())
      ) || menuItems[0]; // fallback to first item if completely unknown

      const quantity = Math.max(1, parsedItem.quantity || 1);
      const unitPrice = matchedMenu.price;
      const costPrice = matchedMenu.cost_price;
      const itemSubtotal = unitPrice * quantity;

      subtotal += itemSubtotal;
      totalCost += costPrice * quantity;

      return {
        menu_item_id: matchedMenu.id,
        item_name: matchedMenu.name,
        quantity: quantity,
        unit_price: unitPrice,
        cost_price: costPrice,
        subtotal: itemSubtotal
      };
    });

    // 5. Business Rules: Check vouchers & Auto Discount rule (subtotal >= 355000)
    let discountAmount = 0;

    if (parsedData.voucher_code) {
      const voucher = await getVoucherByCode(parsedData.voucher_code);
      if (voucher && subtotal >= (voucher.min_order_value || 0)) {
        if (voucher.discount_type === 'fixed') {
          discountAmount = voucher.discount_value;
        } else {
          discountAmount = (subtotal * voucher.discount_value) / 100;
        }
      }
    }

    const AUTO_DISCOUNT_THRESHOLD = Number(process.env.AUTO_DISCOUNT_THRESHOLD || 355000);
    const AUTO_DISCOUNT_VALUE = Number(process.env.AUTO_DISCOUNT_VALUE || 30000);

    if (discountAmount === 0 && subtotal >= AUTO_DISCOUNT_THRESHOLD) {
      discountAmount = AUTO_DISCOUNT_VALUE;
    }

    discountAmount = Math.min(discountAmount, subtotal);

    const finalAmount = Math.max(0, subtotal - discountAmount);
    const estimatedProfit = finalAmount - totalCost;

    return NextResponse.json({
      success: true,
      parsed_data: {
        customer_name: parsedData.customer_name || 'Khách Hàng',
        customer_phone: parsedData.customer_phone || '',
        shipping_address: parsedData.shipping_address || '',
        district: parsedData.district || '',
        city: parsedData.city || 'Hồ Chí Minh',
        branch_id: matchedBranch ? matchedBranch.id : branches[0]?.id || '',
        branch_name: matchedBranch ? matchedBranch.name : 'Chi Nhánh Mặc Định',
        items: processedItems,
        voucher_code: parsedData.voucher_code || '',
        note: parsedData.note || '',
        subtotal,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        estimated_profit: estimatedProfit
      }
    });

  } catch (error) {
    console.error('Error in /api/parse-order:', error);
    return NextResponse.json(
      { error: 'Lỗi trong quá trình xử lý AI. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
