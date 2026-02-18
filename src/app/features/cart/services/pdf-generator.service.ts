import { Injectable } from '@angular/core';
import { CartItem } from '../components/models/cart-item.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root',
})
export class PdfGeneratorService {
  generateProforma(
    cartItems: CartItem[],
    subtotal: number,
    shipping: number,
    total: number
  ): void {
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // ========== HEADER ==========
    doc.setFillColor(250, 250, 249); // #FAFAF9
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Logo / Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(41, 37, 36); // stone-800
    doc.text('GLOSSY BEAUTY', 15, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 113, 108); // stone-500
    doc.text('Prefactura / Proforma', 15, 28);
    
    // Fecha y número
    const currentDate = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const proformaNumber = `PF-${Date.now().toString().slice(-8)}`;
    
    doc.setTextColor(120, 113, 108);
    doc.text(`Fecha: ${currentDate}`, pageWidth - 15, 20, { align: 'right' });
    doc.text(`N°: ${proformaNumber}`, pageWidth - 15, 28, { align: 'right' });
    
    // ========== TABLA DE PRODUCTOS ==========
    const tableData = cartItems.map(item => [
      item.product.name,
      item.selectedVariant.toneName,
      item.quantity.toString(),
      `S/. ${item.selectedVariant.price.toFixed(2)}`,
      `S/. ${(item.selectedVariant.price * item.quantity).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Producto', 'Variante', 'Cant.', 'Precio Unit.', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [41, 37, 36], // stone-800
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [41, 37, 36]
      },
      columnStyles: {
        0: { cellWidth: 70 }, // Producto
        1: { cellWidth: 50 }, // Variante
        2: { cellWidth: 20, halign: 'center' }, // Cantidad
        3: { cellWidth: 25, halign: 'right' }, // Precio
        4: { cellWidth: 25, halign: 'right' } // Subtotal
      },
      alternateRowStyles: {
        fillColor: [250, 250, 249]
      },
      margin: { left: 15, right: 15 }
    });
    
    // ========== TOTALES ==========
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    const totalsX = pageWidth - 70;
    let currentY = finalY + 15;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 113, 108);
    
    // Subtotal
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`S/. ${subtotal.toFixed(2)}`, pageWidth - 15, currentY, { align: 'right' });
    currentY += 8;
    
    // Envío
    doc.text('Envío:', totalsX, currentY);
    if (shipping === 0) {
      doc.setTextColor(244, 63, 94); // rose-500
      doc.setFont('helvetica', 'bold');
      doc.text('GRATIS', pageWidth - 15, currentY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 113, 108);
    } else {
      doc.text(`S/. ${shipping.toFixed(2)}`, pageWidth - 15, currentY, { align: 'right' });
    }
    currentY += 12;
    
    // Línea divisoria
    doc.setDrawColor(231, 229, 228); // stone-200
    doc.line(totalsX - 5, currentY, pageWidth - 15, currentY);
    currentY += 8;
    
    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(41, 37, 36);
    doc.text('TOTAL:', totalsX, currentY);
    doc.text(`S/. ${total.toFixed(2)}`, pageWidth - 15, currentY, { align: 'right' });
    
    // ========== FOOTER ==========
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(168, 162, 158); // stone-400
    
    const footerY = pageHeight - 20;
    doc.text('Este documento es una prefactura y no tiene valor fiscal.', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Válido por 7 días desde la fecha de emisión.', pageWidth / 2, footerY + 5, { align: 'center' });
    
    // ========== GUARDAR PDF ==========
    doc.save(`Prefactura-${proformaNumber}.pdf`);
  }
}
