import { NextRequest, NextResponse } from 'next/server';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  recordInvoicePayment,
  getJournalEntries,
} from '@/lib/data-provider';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (type === 'journals') {
      return NextResponse.json({ success: true, data: getJournalEntries() }, { status: 200 });
    }

    if (id) {
      const inv = getInvoiceById(id);
      if (!inv) {
        return NextResponse.json(
          { success: false, error: `Invoice ${id} tidak ditemukan` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: inv }, { status: 200 });
    }

    return NextResponse.json({ success: true, data: getInvoices() }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengambil data keuangan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    // 1. Record payment for invoice
    if (action === 'payment' || (body.invoiceId && body.amount)) {
      const { invoiceId, amount, method, note, confirmedBy } = body;

      if (!invoiceId || !amount) {
        return NextResponse.json(
          { success: false, error: 'invoiceId dan amount wajib diisi' },
          { status: 400 }
        );
      }

      const result = recordInvoicePayment(
        invoiceId,
        Number(amount),
        method || 'TRANSFER',
        note,
        confirmedBy
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: `Invoice ${invoiceId} tidak ditemukan` },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    // 2. Create Invoice manually for a Sales Order
    if (action === 'create_invoice' || body.salesOrderId) {
      const { salesOrderId } = body;
      const inv = createInvoice(salesOrderId);

      if (!inv) {
        return NextResponse.json(
          { success: false, error: `Sales Order ${salesOrderId} tidak ditemukan` },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: inv }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: 'Aksi keuangan tidak dikenali' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memproses transaksi keuangan' },
      { status: 500 }
    );
  }
}
