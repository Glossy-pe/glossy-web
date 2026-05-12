import { Injectable } from '@angular/core';
import { CartItem } from '../components/models/cart-item.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrderResponse } from '../../../admin-features/order/models/order.model';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
interface ColWidths {
  img:     number;
  product: number;
  tone:    number;
  qty:     number;
  price:   number;
  subtotal:number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Paleta Pastel Coreana (ink-friendly: sin fondos sólidos grandes)
// ─────────────────────────────────────────────────────────────────────────────
const P = {
  ink:        [50,  45,  50 ] as [number,number,number],   // texto principal
  muted:      [140, 130, 135] as [number,number,number],   // texto secundario
  rose:       [220, 160, 170] as [number,number,number],   // acento rosa
  peach:      [240, 200, 185] as [number,number,number],   // acento melocotón
  lavender:   [195, 185, 220] as [number,number,number],   // acento lavanda
  rowAlt:     [252, 248, 250] as [number,number,number],   // fila alternada (muy suave)
  white:      [255, 255, 255] as [number,number,number],
  border:     [220, 210, 215] as [number,number,number],   // borde suave
  headerBg:   [250, 243, 246] as [number,number,number],   // fondo header página
  tagBg:      [209, 250, 229] as [number,number,number],
  tagText:    [6,   95,  70 ] as [number,number,number],
};

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {

  // ══════════════════════════════════════════════════════════════════════════
  // PROFORMA
  // ══════════════════════════════════════════════════════════════════════════
  generateProforma(cartItems: CartItem[], subtotal: number, total: number): void {
    const doc = new jsPDF();
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── Header suave ────────────────────────────────────────────────────────
    doc.setFillColor(...P.headerBg);
    doc.rect(0, 0, pageWidth, 36, 'F');

    // Línea acento izquierda
    doc.setFillColor(...P.rose);
    doc.rect(0, 0, 3, 36, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...P.ink);
    doc.text('Glossy Beauty', 10, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...P.muted);
    doc.text('Prefactura · Proforma', 10, 23);

    const currentDate = new Date().toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const proformaNumber = `PF-${Date.now().toString().slice(-8)}`;

    doc.setFontSize(8);
    doc.setTextColor(...P.muted);
    doc.text(`Fecha: ${currentDate}`, pageWidth - 10, 16, { align: 'right' });
    doc.text(`N°: ${proformaNumber}`,  pageWidth - 10, 23, { align: 'right' });

    // Línea separadora delicada
    doc.setDrawColor(...P.border);
    doc.setLineWidth(0.3);
    doc.line(10, 38, pageWidth - 10, 38);

    // ── Tabla ────────────────────────────────────────────────────────────────
    const tableData = cartItems.map(item => [
      item.product.name,
      item.selectedVariant.toneName,
      item.quantity.toString(),
      `S/. ${Number(item.selectedVariant.price).toFixed(2)}`,
      `S/. ${(Number(item.selectedVariant.price) * item.quantity).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 44,
      head: [['Producto', 'Variante', 'Cant.', 'P. Unit.', 'Subtotal']],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: P.rose,
        textColor: P.white,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }
      },
      bodyStyles: {
        fontSize: 8,
        textColor: P.ink,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }
      },
      columnStyles: {
        0: { cellWidth: 72 },
        1: { cellWidth: 48 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 26, halign: 'right' }
      },
      alternateRowStyles: { fillColor: P.rowAlt },
      tableLineColor: P.border,
      tableLineWidth: 0.2,
      margin: { left: 10, right: 10 }
    });

    // ── Totales ──────────────────────────────────────────────────────────────
    const finalY   = (doc as any).lastAutoTable.finalY || 150;
    const totalsX  = pageWidth - 75;
    let   currentY = finalY + 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...P.muted);
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`S/. ${Number(subtotal).toFixed(2)}`, pageWidth - 10, currentY, { align: 'right' });
    currentY += 7;

    doc.setDrawColor(...P.border);
    doc.setLineWidth(0.3);
    doc.line(totalsX, currentY, pageWidth - 10, currentY);
    currentY += 6;

    // Caja total pastel
    doc.setFillColor(...P.peach);
    doc.roundedRect(totalsX - 2, currentY - 4, pageWidth - totalsX - 8, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...P.ink);
    doc.text('Total:', totalsX + 1, currentY + 3);
    doc.text(`S/. ${Number(total).toFixed(2)}`, pageWidth - 12, currentY + 3, { align: 'right' });

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.setDrawColor(...P.border);
    doc.setLineWidth(0.3);
    doc.line(10, pageHeight - 14, pageWidth - 10, pageHeight - 14);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...P.muted);
    doc.text('Este documento es una prefactura y no tiene valor fiscal. Válido por 7 días.', pageWidth / 2, pageHeight - 8, { align: 'center' });

    doc.save(`Prefactura-${proformaNumber}.pdf`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ORDEN
  // ══════════════════════════════════════════════════════════════════════════
  generateOrderPdf(order: OrderResponse): void {
    const doc = new jsPDF();
    this.loadOrderImages(order).then(imageMap => {
      this.buildOrderPdf(doc, order, imageMap);
    });
  }

  private async loadOrderImages(order: OrderResponse): Promise<Map<number, string>> {
    const imageMap = new Map<number, string>();
    const promises = order.orderItems.map(async item => {
      const url = item.productVariant.mainImageUrl;
      if (!url) return;
      try {
        const base64 = await this.urlToBase64(url);
        imageMap.set(item.productVariant.id, base64);
      } catch { /* omitir si falla */ }
    });
    await Promise.all(promises);
    return imageMap;
  }

  private async urlToBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BUILD PDF
  // ──────────────────────────────────────────────────────────────────────────
  private buildOrderPdf(doc: jsPDF, order: OrderResponse, imageMap: Map<number, string>): void {
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Constantes de layout (compactas para más productos por página)
    const ML           = 10;   // margin left
    const MR           = 10;   // margin right
    const HEADER_H     = 52;   // header (más compacto)
    const FOOTER_H     = 12;
    const TH_H         = 7;    // table header height
    const ROW_H        = 14;   // fila compacta (era 18)
    const IMG_SIZE     = 10;   // imagen más pequeña
    const colW: ColWidths = {
      img:     14,
      product: 60,
      tone:    32,
      qty:     12,
      price:   24,
      subtotal:24,
    };

    // ── Helpers ──────────────────────────────────────────────────────────────

    const drawPageHeader = (pageNum: number, totalPages: number) => {
      // Fondo muy suave
      doc.setFillColor(...P.headerBg);
      doc.rect(0, 0, pageWidth, HEADER_H, 'F');

      // Barra acento izquierda
      doc.setFillColor(...P.rose);
      doc.rect(0, 0, 3, HEADER_H, 'F');

      // Logo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...P.ink);
      doc.text('Glossy Beauty', ML + 4, 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...P.muted);
      doc.text('Sistema de Administración', ML + 4, 19);

      // Datos orden — siempre en todas las páginas
      const colLeft  = ML + 4;
      const colRight = pageWidth / 2 + 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...P.muted);

      // Fila 1
      doc.text('Orden:', colLeft, 28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...P.ink);
      doc.text(`#${order.id}  ·  ${order.orderCode}`, colLeft + 16, 28);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...P.muted);
      doc.text('Estado:', colRight, 28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...P.ink);
      doc.text(order.status, colRight + 16, 28);

      // Fila 2
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...P.muted);
      doc.text('Cliente:', colLeft, 35);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...P.ink);
      const nameMax = order.customerName.length > 30 ? order.customerName.substring(0, 28) + '…' : order.customerName;
      doc.text(nameMax, colLeft + 16, 35);

      const fecha = new Date(order.createdAt).toLocaleDateString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...P.muted);
      doc.text('Fecha:', colRight, 35);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...P.ink);
      doc.text(fecha, colRight + 16, 35);

      // Fila 3 — dirección
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...P.muted);
      doc.text('Dirección:', colLeft, 42);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...P.ink);
      const addrMax = order.customerAddress.length > 55 ? order.customerAddress.substring(0, 53) + '…' : order.customerAddress;
      doc.text(addrMax, colLeft + 20, 42);

      // Página
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...P.muted);
      doc.text(`Pág. ${pageNum} / ${totalPages}`, pageWidth - MR, 42, { align: 'right' });

      // Línea separadora
      doc.setDrawColor(...P.border);
      doc.setLineWidth(0.3);
      doc.line(ML, HEADER_H - 1, pageWidth - MR, HEADER_H - 1);
    };

    const drawFooter = () => {
      doc.setDrawColor(...P.border);
      doc.setLineWidth(0.3);
      doc.line(ML, pageHeight - FOOTER_H, pageWidth - MR, pageHeight - FOOTER_H);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(...P.muted);
      doc.text(
        'Documento generado automáticamente · Glossy Beauty Administración',
        pageWidth / 2, pageHeight - 4, { align: 'center' }
      );
    };

    const drawTableHeader = (y: number): number => {
      doc.setFillColor(...P.lavender);
      doc.rect(ML, y, pageWidth - ML - MR, TH_H, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...P.ink);
      let x = ML;
      doc.text('',         x + 2, y + 4.8); x += colW.img;
      doc.text('PRODUCTO', x + 2, y + 4.8); x += colW.product;
      doc.text('VARIANTE', x + 2, y + 4.8); x += colW.tone;
      doc.text('CANT.',    x + 2, y + 4.8); x += colW.qty;
      doc.text('P.UNIT.',  x + 2, y + 4.8); x += colW.price;
      doc.text('SUBTOTAL', x + 2, y + 4.8);
      return y + TH_H;
    };

    // ── Pre-calcular páginas ──────────────────────────────────────────────────
    // Espacio útil: header + info-extra p1 + totales + footer
    const INFO_EXTRA   = 0;   // la info ya está en el header
    const TOTALS_H     = 28;
    const usableFirst  = pageHeight - HEADER_H - TH_H - TOTALS_H - FOOTER_H - 6;
    const usableOther  = pageHeight - HEADER_H - TH_H - FOOTER_H - 4;
    const rowsFirst    = Math.floor(usableFirst  / ROW_H);
    const rowsOther    = Math.floor(usableOther  / ROW_H);

    const remaining    = Math.max(0, order.orderItems.length - rowsFirst);
    const extraPages   = remaining > 0 ? Math.ceil(remaining / rowsOther) : 0;
    const totalPages   = 1 + extraPages;

    // ══════════════════════════════════════════════════════════════════════════
    // PÁGINA 1
    // ══════════════════════════════════════════════════════════════════════════
    drawPageHeader(1, totalPages);

    let tableY   = HEADER_H + 3;
    let currentY = drawTableHeader(tableY);
    const tableBodyStartY = currentY;

    const itemsPage1 = order.orderItems.slice(0, rowsFirst);
    itemsPage1.forEach((item, i) => {
      if (i % 2 !== 0) {
        doc.setFillColor(...P.rowAlt);
        doc.rect(ML, currentY, pageWidth - ML - MR, ROW_H, 'F');
      }
      this.drawRow(doc, item, imageMap, currentY, colW, IMG_SIZE, ML);
      currentY += ROW_H;
    });

    // Borde tabla
    doc.setDrawColor(...P.border);
    doc.setLineWidth(0.2);
    doc.rect(ML, tableY, pageWidth - ML - MR, currentY - tableY);

    if (totalPages === 1) {
      this.drawTotals(doc, order, currentY, pageWidth, MR);
    }
    drawFooter();

    // ══════════════════════════════════════════════════════════════════════════
    // PÁGINAS ADICIONALES
    // ══════════════════════════════════════════════════════════════════════════
    let itemIndex = rowsFirst;

    for (let p = 2; p <= totalPages; p++) {
      doc.addPage();
      drawPageHeader(p, totalPages);

      tableY   = HEADER_H + 3;
      currentY = drawTableHeader(tableY);

      const isLast = p === totalPages;
      const limit  = isLast ? order.orderItems.length : itemIndex + rowsOther;
      const pageItems = order.orderItems.slice(itemIndex, limit);

      pageItems.forEach((item, i) => {
        if (i % 2 !== 0) {
          doc.setFillColor(...P.rowAlt);
          doc.rect(ML, currentY, pageWidth - ML - MR, ROW_H, 'F');
        }
        this.drawRow(doc, item, imageMap, currentY, colW, IMG_SIZE, ML);
        currentY += ROW_H;
      });

      doc.setDrawColor(...P.border);
      doc.setLineWidth(0.2);
      doc.rect(ML, tableY, pageWidth - ML - MR, currentY - tableY);

      if (isLast) {
        this.drawTotals(doc, order, currentY, pageWidth, MR);
      }
      drawFooter();
      itemIndex = limit;
    }

    doc.save(`orden-${order.orderCode}.pdf`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DRAW ROW  (sin stock, filas compactas)
  // ──────────────────────────────────────────────────────────────────────────
  private drawRow(
    doc: jsPDF,
    item: any,
    imageMap: Map<number, string>,
    y: number,
    colW: ColWidths,
    imgSize: number,
    ml: number
  ): void {
    const centerY = y + (14 / 2); // ROW_H / 2 centrado vertical

    // Imagen o color swatch
    const base64 = imageMap.get(item.productVariant.id);
    if (base64) {
      // Imagen con bordes redondeados simulados (rect clip)
      doc.addImage(base64, 'JPEG', ml + 2, y + 2, imgSize, imgSize);
    } else if (item.productVariant.toneCode) {
      const hex = item.productVariant.toneCode.replace('#', '');
      doc.setFillColor(
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16)
      );
      doc.roundedRect(ml + 2, y + 2, imgSize, imgSize, 1, 1, 'F');
      doc.setDrawColor(...P.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(ml + 2, y + 2, imgSize, imgSize, 1, 1, 'S');
    }

    let x = ml + colW.img;

    // Nombre producto
    const name = item.productVariant.productName.length > 30
      ? item.productVariant.productName.substring(0, 28) + '…'
      : item.productVariant.productName;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...P.ink);
    doc.text(name, x + 2, centerY + 1);
    // SIN stock

    x += colW.product;

    // Variante / tono
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...P.muted);
    doc.text(item.productVariant.toneName, x + 2, centerY + 1);

    x += colW.tone;

    // Cantidad
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...P.ink);
    doc.text(item.quantity.toString(), x + 2, centerY + 1);

    x += colW.qty;

    // Precio unitario
    doc.setFont('helvetica', 'normal');
    doc.text(`S/. ${item.productVariant.price.toFixed(2)}`, x + 2, centerY + 1);

    x += colW.price;

    // Subtotal
    doc.setFont('helvetica', 'bold');
    doc.text(`S/. ${(item.productVariant.price * item.quantity).toFixed(2)}`, x + 2, centerY + 1);

    // Badge "separado" — solo si aplica
    if (item.separated) {
      doc.setFillColor(...P.tagBg);
      doc.roundedRect(x + 2, y + 8, 14, 4, 1, 1, 'F');
      doc.setFontSize(5.5);
      doc.setTextColor(...P.tagText);
      doc.text('SEP', x + 3.5, y + 11.2);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DRAW TOTALS (pastel, sin bloque negro)
  // ──────────────────────────────────────────────────────────────────────────
  private drawTotals(
    doc: jsPDF,
    order: OrderResponse,
    afterTableY: number,
    pageWidth: number,
    mr: number
  ): void {
    let y      = afterTableY + 6;
    const tx   = pageWidth - 75;

    const subtotal = order.orderItems.reduce(
      (acc, item) => acc + item.productVariant.price * item.quantity, 0
    );

    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...P.muted);
    doc.text('Subtotal:', tx, y);
    doc.text(`S/. ${subtotal.toFixed(2)}`, pageWidth - mr, y, { align: 'right' });
    y += 6;

    // Línea divisoria
    doc.setDrawColor(...P.border);
    doc.setLineWidth(0.3);
    doc.line(tx, y, pageWidth - mr, y);
    y += 5;

    // Caja total — fondo pastel melocotón, sin negro
    doc.setFillColor(...P.peach);
    doc.roundedRect(tx - 2, y - 3, pageWidth - tx - mr + 2, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...P.ink);
    doc.text('Total:', tx + 1, y + 4.5);
    doc.text(`S/. ${Number(order.total).toFixed(2)}`, pageWidth - mr - 2, y + 4.5, { align: 'right' });
  }
}