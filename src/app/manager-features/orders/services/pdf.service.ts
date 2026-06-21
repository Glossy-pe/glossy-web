import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { firstValueFrom } from 'rxjs';
import { OrderService } from './order.service';
import { OrderResponseFull } from '../models/order-response-full.model';
import { OrderItemResponseFull } from '../../order-items/models/order-item-response-full.model';

const BRAND = {
  name: 'Glossy',
  primary: [31, 31, 31] as [number, number, number],      // negro suave
  accent: [201, 162, 122] as [number, number, number],    // dorado/beige
  gray: [120, 120, 120] as [number, number, number],
  lightBg: [247, 245, 242] as [number, number, number],
};

@Injectable({
  providedIn: 'root',
})
export class PdfService {

  constructor(private orderService: OrderService) {}

  async generateProforma(orderId: number): Promise<void> {
    const order = await firstValueFrom(this.orderService.getFullById(orderId)) as OrderResponseFull;
    if (!order) throw new Error('Orden no encontrada');

    const doc = new jsPDF();

    this.addHeader(doc, order);
    await this.addItemsTable(doc, order);
    this.addTotals(doc, order);
    this.addFooter(doc);

    doc.save(`proforma-${order.orderCode}.pdf`);
  }

  // ---------- HEADER ----------

  private addHeader(doc: jsPDF, order: OrderResponseFull): void {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Franja de marca
    doc.setFillColor(...BRAND.primary);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(BRAND.name, 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('PROFORMA', pageWidth - 14, 18, { align: 'right' });

    // Bloque info orden
    doc.setTextColor(...BRAND.primary);
    doc.setFontSize(10);

    let y = 38;
    doc.setFont('helvetica', 'bold');
    doc.text('Código de orden', 14, y);
    doc.text('Fecha', pageWidth - 14, y, { align: 'right' });

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.gray);
    doc.text(order.orderCode, 14, y);
    doc.text(
      order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-PE') : '-',
      pageWidth - 14,
      y,
      { align: 'right' }
    );

    // Datos cliente en caja
    y += 8;
    doc.setFillColor(...BRAND.lightBg);
    doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.primary);
    doc.setFontSize(9);
    doc.text('CLIENTE', 18, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.gray);
    doc.text(order.customerName, 18, y + 12);
    doc.text(order.customerAddress, 18, y + 18);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.primary);
    doc.text('ESTADO', pageWidth - 60, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.gray);
    doc.text(order.orderStatus?.description ?? '-', pageWidth - 60, y + 12);
  }

  // ---------- ITEMS TABLE ----------

  private async addItemsTable(doc: jsPDF, order: OrderResponseFull): Promise<void> {
    const images = await Promise.all(
      order.items.map((item: OrderItemResponseFull) =>
        this.toBase64(item.variant?.imageUrl ?? null)
      )
    );

    autoTable(doc, {
      startY: 72,
      head: [['', 'Producto', 'Tono', 'Cant.', 'P. Unit.', 'Subtotal']],
      body: order.items.map((item: OrderItemResponseFull) => [
        '',
        item.variant?.productName ?? '-',
        item.variant?.toneName ?? '-',
        item.quantity.toString(),
        `S/ ${(item.unitPrice ?? 0).toFixed(2)}`,
        `S/ ${((item.unitPrice ?? 0) * item.quantity).toFixed(2)}`,
      ]),
      theme: 'plain',
      headStyles: {
        fillColor: BRAND.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: BRAND.primary,
        minCellHeight: 18,
        valign: 'middle',
      },
      alternateRowStyles: { fillColor: BRAND.lightBg },
      columnStyles: {
        0: { cellWidth: 20 },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const base64 = images[data.row.index];
          if (base64) {
            doc.addImage(base64, 'JPEG', data.cell.x + 3, data.cell.y + 3, 14, 14, undefined, 'FAST');
          } else {
            doc.setDrawColor(...BRAND.gray);
            doc.roundedRect(data.cell.x + 3, data.cell.y + 3, 14, 14, 1, 1, 'S');
          }
        }
      },
    });
  }

  // ---------- TOTALS ----------

  private addTotals(doc: jsPDF, order: OrderResponseFull): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const finalY = (doc as any).lastAutoTable.finalY + 8;

    const boxWidth = 70;
    const boxX = pageWidth - 14 - boxWidth;

    doc.setDrawColor(...BRAND.accent);
    doc.line(boxX, finalY, pageWidth - 14, finalY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.primary);
    doc.text('TOTAL', boxX, finalY + 7);
    doc.text(`S/ ${order.total.toFixed(2)}`, pageWidth - 14, finalY + 7, { align: 'right' });
  }

  // ---------- FOOTER ----------

  private addFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(...BRAND.lightBg);
      doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

      doc.setFontSize(8);
      doc.setTextColor(...BRAND.gray);
      doc.text(`${BRAND.name} · Documento generado automáticamente`, 14, pageHeight - 10);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }
  }

  // ---------- UTILS ----------

  private toBase64(url: string | null): Promise<string | null> {
    if (!url) return Promise.resolve(null);

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }
}