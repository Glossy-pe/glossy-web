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

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setFillColor(41, 37, 36);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('GLOSSY BEAUTY', 15, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 170, 165);
  doc.text('Sistema de Administración', 15, 28);

  const currentDate = new Date(order.createdAt).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Fecha: ${currentDate}`,   pageWidth - 15, 20, { align: 'right' });
  doc.text(`Estado: ${order.status}`, pageWidth - 15, 28, { align: 'right' });

  // ── Info orden + cliente ─────────────────────────────────────────────────
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(15, 50, 85, 32, 3, 3, 'F');

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

  // ── Tabla con imágenes ───────────────────────────────────────────────────
  const ROW_HEIGHT = 18;
  const IMG_SIZE   = 14;
  const startY     = 92;
  const colWidths  = { img: 18, product: 58, tone: 35, qty: 15, price: 25, subtotal: 28 };

  // Encabezado tabla
  doc.setFillColor(41, 37, 36);
  doc.rect(15, startY, pageWidth - 30, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  let x = 15;
  doc.text('',          x + 2,                          startY + 5.5); x += colWidths.img;
  doc.text('PRODUCTO',  x + 2,                          startY + 5.5); x += colWidths.product;
  doc.text('VARIANTE',  x + 2,                          startY + 5.5); x += colWidths.tone;
  doc.text('CANT.',     x + 2,                          startY + 5.5); x += colWidths.qty;
  doc.text('P.UNIT',    x + 2,                          startY + 5.5); x += colWidths.price;
  doc.text('SUBTOTAL',  x + 2,                          startY + 5.5);

  // Filas
  let currentY = startY + 8;

  order.orderItems.forEach((item, i) => {
    const isEven = i % 2 === 0;
    doc.setFillColor(isEven ? 250 : 255, isEven ? 250 : 255, isEven ? 249 : 255);
    doc.rect(15, currentY, pageWidth - 30, ROW_HEIGHT, 'F');

    // Imagen
    const base64 = imageMap.get(item.productVariant.id);
    if (base64) {
      doc.addImage(base64, 'JPEG', 17, currentY + 2, IMG_SIZE, IMG_SIZE);
    } else if (item.productVariant.toneCode) {
      // Fallback: cuadrado de color del tono
      const hex = item.productVariant.toneCode.replace('#', '');
      const r = parseInt(hex.substring(0,2), 16);
      const g = parseInt(hex.substring(2,4), 16);
      const b = parseInt(hex.substring(4,6), 16);
      doc.setFillColor(r, g, b);
      doc.rect(17, currentY + 2, IMG_SIZE, IMG_SIZE, 'F');
    }

    x = 15 + colWidths.img;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(41, 37, 36);
    // Truncar nombre si es muy largo
    const name = item.productVariant.productName.length > 28
      ? item.productVariant.productName.substring(0, 26) + '...'
      : item.productVariant.productName;
    doc.text(name, x + 2, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text(`Stock: ${item.productVariant.stock}`, x + 2, currentY + 13);

    x += colWidths.product;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(41, 37, 36);
    doc.text(item.productVariant.toneName, x + 2, currentY + 10);

    x += colWidths.tone;
    doc.setFont('helvetica', 'bold');
    doc.text(item.quantity.toString(), x + 2, currentY + 10);

    x += colWidths.qty;
    doc.setFont('helvetica', 'normal');
    doc.text(`S/. ${item.productVariant.price.toFixed(2)}`, x + 2, currentY + 10);

    x += colWidths.price;
    doc.setFont('helvetica', 'bold');
    doc.text(`S/. ${(item.productVariant.price * item.quantity).toFixed(2)}`, x + 2, currentY + 10);

    // Badges separado / empacado
    if (item.separated) {
      doc.setFillColor(209, 250, 229);
      doc.roundedRect(x + 2, currentY + 12, 12, 4, 1, 1, 'F');
      doc.setFontSize(6);
      doc.setTextColor(6, 95, 70);
      doc.text('SEP', x + 3.5, currentY + 15.2);
    }

    currentY += ROW_HEIGHT;
  });

  // Borde tabla
  doc.setDrawColor(231, 229, 228);
  doc.rect(15, startY, pageWidth - 30, currentY - startY);

  // ── Totales ──────────────────────────────────────────────────────────────
  currentY += 10;
  const totalsX = pageWidth - 80;

  const subtotal = order.orderItems.reduce(
    (acc, item) => acc + item.productVariant.price * item.quantity, 0
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 113, 108);
  doc.text('Subtotal:', totalsX, currentY);
  doc.text(`S/. ${subtotal.toFixed(2)}`, pageWidth - 15, currentY, { align: 'right' });
  currentY += 8;

  doc.setFillColor(41, 37, 36);
  doc.rect(totalsX - 5, currentY - 4, pageWidth - totalsX - 10, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', totalsX, currentY + 6);
  doc.text(`S/. ${Number(order.total).toFixed(2)}`, pageWidth - 17, currentY + 6, { align: 'right' });

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.setFillColor(41, 37, 36);
  doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(180, 170, 165);
  doc.text('Documento generado automáticamente por el sistema.', pageWidth / 2, pageHeight - 9, { align: 'center' });
  doc.text('Glossy Beauty · Administración', pageWidth / 2, pageHeight - 4, { align: 'center' });

  doc.save(`orden-${order.orderCode}.pdf`);
}
}