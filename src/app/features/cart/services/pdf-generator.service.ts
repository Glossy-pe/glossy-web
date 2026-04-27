import { Injectable } from '@angular/core';
import { CartItem } from '../components/models/cart-item.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrderResponse } from '../../../admin-features/order/models/order.model';

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {

  generateProforma(cartItems: CartItem[], subtotal: number, total: number): void {
    const doc = new jsPDF();
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── Header ───────────────────────────────────────────────────────────────
    doc.setFillColor(250, 250, 249);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(41, 37, 36);
    doc.text('GLOSSY BEAUTY', 15, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 113, 108);
    doc.text('Prefactura / Proforma', 15, 28);

    const currentDate = new Date().toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const proformaNumber = `PF-${Date.now().toString().slice(-8)}`;

    doc.setTextColor(120, 113, 108);
    doc.text(`Fecha: ${currentDate}`, pageWidth - 15, 20, { align: 'right' });
    doc.text(`N°: ${proformaNumber}`,  pageWidth - 15, 28, { align: 'right' });

    // ── Tabla ────────────────────────────────────────────────────────────────
    const tableData = cartItems.map(item => [
      item.product.name,
      item.selectedVariant.toneName,
      item.quantity.toString(),
      `S/. ${Number(item.selectedVariant.price).toFixed(2)}`,
      `S/. ${(Number(item.selectedVariant.price) * item.quantity).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Producto', 'Variante', 'Cant.', 'Precio Unit.', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [41, 37, 36],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: { fontSize: 9, textColor: [41, 37, 36] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 50 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' }
      },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      margin: { left: 15, right: 15 }
    });

    // ── Totales ──────────────────────────────────────────────────────────────
    const finalY   = (doc as any).lastAutoTable.finalY || 150;
    const totalsX  = pageWidth - 70;
    let   currentY = finalY + 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 113, 108);
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`S/. ${Number(subtotal).toFixed(2)}`, pageWidth - 15, currentY, { align: 'right' });
    currentY += 12;

    doc.setDrawColor(231, 229, 228);
    doc.line(totalsX - 5, currentY, pageWidth - 15, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(41, 37, 36);
    doc.text('TOTAL:', totalsX, currentY);
    doc.text(`S/. ${Number(total).toFixed(2)}`, pageWidth - 15, currentY, { align: 'right' });

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(168, 162, 158);
    doc.text('Este documento es una prefactura y no tiene valor fiscal.', pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('Válido por 7 días desde la fecha de emisión.',              pageWidth / 2, pageHeight - 5,  { align: 'center' });

    doc.save(`Prefactura-${proformaNumber}.pdf`);
  }

  private drawRow(
  doc: jsPDF,
  item: any,
  imageMap: Map<number, string>,
  y: number,
  colWidths: Record<string, number>,
  imgSize: number,
  marginLeft: number
): void {
  // Imagen o color fallback
  const base64 = imageMap.get(item.productVariant.id);
  if (base64) {
    doc.addImage(base64, 'JPEG', marginLeft + 2, y + 2, imgSize, imgSize);
  } else if (item.productVariant.toneCode) {
    const hex = item.productVariant.toneCode.replace('#', '');
    doc.setFillColor(
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16)
    );
    doc.rect(marginLeft + 2, y + 2, imgSize, imgSize, 'F');
  }

  let x = marginLeft + colWidths['img'];

  const name = item.productVariant.productName.length > 28
    ? item.productVariant.productName.substring(0, 26) + '...'
    : item.productVariant.productName;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(41, 37, 36);
  doc.text(name, x + 2, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text(`Stock: ${item.productVariant.stock}`, x + 2, y + 13);

  x += colWidths['product'];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(41, 37, 36);
  doc.text(item.productVariant.toneName, x + 2, y + 10);

  x += colWidths['tone'];
  doc.setFont('helvetica', 'bold');
  doc.text(item.quantity.toString(), x + 2, y + 10);

  x += colWidths['qty'];
  doc.setFont('helvetica', 'normal');
  doc.text(`S/. ${item.productVariant.price.toFixed(2)}`, x + 2, y + 10);

  x += colWidths['price'];
  doc.setFont('helvetica', 'bold');
  doc.text(`S/. ${(item.productVariant.price * item.quantity).toFixed(2)}`, x + 2, y + 10);

  // Badge separado
  if (item.separated) {
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(x + 2, y + 12, 12, 4, 1, 1, 'F');
    doc.setFontSize(6);
    doc.setTextColor(6, 95, 70);
    doc.text('SEP', x + 3.5, y + 15.2);
  }
}

private drawTotals(
  doc: jsPDF,
  order: OrderResponse,
  afterTableY: number,
  pageWidth: number,
  marginRight: number
): void {
  let currentY = afterTableY + 10;
  const totalsX = pageWidth - 80;

  const subtotal = order.orderItems.reduce(
    (acc, item) => acc + item.productVariant.price * item.quantity, 0
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 113, 108);
  doc.text('Subtotal:', totalsX, currentY);
  doc.text(`S/. ${subtotal.toFixed(2)}`, pageWidth - marginRight, currentY, { align: 'right' });
  currentY += 8;

  doc.setFillColor(41, 37, 36);
  doc.rect(totalsX - 5, currentY - 4, pageWidth - totalsX - marginRight + 5, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', totalsX, currentY + 6);
  doc.text(`S/. ${Number(order.total).toFixed(2)}`, pageWidth - marginRight - 2, currentY + 6, { align: 'right' });
}

generateOrderPdf(order: OrderResponse): void {
  const doc = new jsPDF();
  
  // Primero cargar todas las imágenes, luego generar el PDF
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
    } catch {
      // si falla la imagen, se omite
    }
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
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(); // cache-bust
  });
}

private buildOrderPdf(doc: jsPDF, order: OrderResponse, imageMap: Map<number, string>): void {
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const MARGIN_LEFT   = 15;
  const MARGIN_RIGHT  = 15;
  const FOOTER_HEIGHT = 18;
  const HEADER_HEIGHT = 45;
  const ROW_HEIGHT    = 18;
  const IMG_SIZE      = 14;
  const colWidths     = { img: 18, product: 58, tone: 35, qty: 15, price: 25, subtotal: 28 };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const drawHeader = (pageNum: number, totalPages: number) => {
    doc.setFillColor(41, 37, 36);
    doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('GLOSSY BEAUTY', MARGIN_LEFT, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 170, 165);
    doc.text('Sistema de Administración', MARGIN_LEFT, 28);

    const currentDate = new Date(order.createdAt).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`Fecha: ${currentDate}`,   pageWidth - MARGIN_RIGHT, 20, { align: 'right' });
    doc.text(`Estado: ${order.status}`, pageWidth - MARGIN_RIGHT, 28, { align: 'right' });
    doc.text(`Pág. ${pageNum} / ${totalPages}`, pageWidth - MARGIN_RIGHT, 38, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setFillColor(41, 37, 36);
    doc.rect(0, pageHeight - FOOTER_HEIGHT, pageWidth, FOOTER_HEIGHT, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(180, 170, 165);
    doc.text('Documento generado automáticamente por el sistema.',
      pageWidth / 2, pageHeight - 9, { align: 'center' });
    doc.text('Glossy Beauty · Administración',
      pageWidth / 2, pageHeight - 4, { align: 'center' });
  };

  const drawTableHeader = (y: number) => {
    doc.setFillColor(41, 37, 36);
    doc.rect(MARGIN_LEFT, y, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    let x = MARGIN_LEFT;
    doc.text('',         x + 2, y + 5.5); x += colWidths.img;
    doc.text('PRODUCTO', x + 2, y + 5.5); x += colWidths.product;
    doc.text('VARIANTE', x + 2, y + 5.5); x += colWidths.tone;
    doc.text('CANT.',    x + 2, y + 5.5); x += colWidths.qty;
    doc.text('P.UNIT',   x + 2, y + 5.5); x += colWidths.price;
    doc.text('SUBTOTAL', x + 2, y + 5.5);
    return y + 8;
  };

  // ── Pre-calcular total de páginas ─────────────────────────────────────────
  // Página 1: header(45) + info(32+10) + tabla header(8) + filas + totales(~50) + footer(18)
  // Páginas siguientes: header(45) + tabla header(8) + filas + footer(18)

  const usableFirstPage  = pageHeight - HEADER_HEIGHT - 47 /* info */ - 8 /* th */ - 50 /* totales */ - FOOTER_HEIGHT;
  const usableOtherPages = pageHeight - HEADER_HEIGHT - 8 /* th */ - FOOTER_HEIGHT - 5;
  const rowsFirstPage    = Math.floor(usableFirstPage  / ROW_HEIGHT);
  const rowsOtherPages   = Math.floor(usableOtherPages / ROW_HEIGHT);

  const remaining = Math.max(0, order.orderItems.length - rowsFirstPage);
  const extraPages = remaining > 0 ? Math.ceil(remaining / rowsOtherPages) : 0;
  const totalPages = 1 + extraPages;

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINA 1
  // ══════════════════════════════════════════════════════════════════════════
  drawHeader(1, totalPages);

  // Info orden + cliente
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(MARGIN_LEFT, 50, 85, 32, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(120, 113, 108);
  doc.text('ORDEN', 21, 58);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(41, 37, 36);
  doc.text(`#${order.id}`, 21, 66);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 113, 108);
  doc.text(`Código: ${order.orderCode}`, 21, 73);

  doc.setFillColor(250, 250, 249);
  doc.roundedRect(105, 50, 90, 32, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(120, 113, 108);
  doc.text('CLIENTE', 111, 58);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(41, 37, 36);
  doc.text(order.customerName, 111, 66);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text(order.customerAddress, 111, 73);

  // Tabla – primera página
  let tableStartY = 92;
  let currentY    = drawTableHeader(tableStartY);
  const tableBodyStartY = currentY; // para el borde final en p1

  // ── Filas pág. 1 ─────────────────────────────────────────────────────────
  const itemsPage1 = order.orderItems.slice(0, rowsFirstPage);

  itemsPage1.forEach((item, i) => {
    const isEven = i % 2 === 0;
    doc.setFillColor(isEven ? 250 : 255, isEven ? 250 : 255, isEven ? 249 : 255);
    doc.rect(MARGIN_LEFT, currentY, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, ROW_HEIGHT, 'F');

    this.drawRow(doc, item, imageMap, currentY, colWidths, IMG_SIZE, MARGIN_LEFT);
    currentY += ROW_HEIGHT;
  });

  // Borde tabla pág. 1
  doc.setDrawColor(231, 229, 228);
  doc.rect(MARGIN_LEFT, tableStartY, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, currentY - tableStartY);

  // ── Totales (solo si es la última página o una sola) ──────────────────────
  if (totalPages === 1) {
    this.drawTotals(doc, order, currentY, pageWidth, MARGIN_RIGHT);
  }

  drawFooter();

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINAS ADICIONALES
  // ══════════════════════════════════════════════════════════════════════════
  let itemIndex = rowsFirstPage;

  for (let p = 2; p <= totalPages; p++) {
    doc.addPage();
    drawHeader(p, totalPages);

    tableStartY = HEADER_HEIGHT + 5;
    currentY    = drawTableHeader(tableStartY);

    const isLastPage = p === totalPages;
    const limit      = isLastPage
      ? order.orderItems.length
      : itemIndex + rowsOtherPages;

    const pageItems = order.orderItems.slice(itemIndex, limit);

    pageItems.forEach((item, i) => {
      const isEven = i % 2 === 0;
      doc.setFillColor(isEven ? 250 : 255, isEven ? 250 : 255, isEven ? 249 : 255);
      doc.rect(MARGIN_LEFT, currentY, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, ROW_HEIGHT, 'F');

      this.drawRow(doc, item, imageMap, currentY, colWidths, IMG_SIZE, MARGIN_LEFT);
      currentY += ROW_HEIGHT;
    });

    // Borde tabla
    doc.setDrawColor(231, 229, 228);
    doc.rect(MARGIN_LEFT, tableStartY, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, currentY - tableStartY);

    if (isLastPage) {
      this.drawTotals(doc, order, currentY, pageWidth, MARGIN_RIGHT);
    }

    drawFooter();
    itemIndex = limit;
  }

  doc.save(`orden-${order.orderCode}.pdf`);
}
}