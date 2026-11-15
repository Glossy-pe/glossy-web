import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment'; // ajusta la ruta

export interface PaymentProof {
  id: number;
  url: string;
  note: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentProofService {
  private readonly http = inject(HttpClient);

  private url(orderId: number) {
    return `${environment.apiUrl}/api/manager/orders/${orderId}/payment-proofs`;
  }

  getAll(orderId: number): Observable<PaymentProof[]> {
    return this.http.get<PaymentProof[]>(this.url(orderId));
  }

  upload(orderId: number, form: FormData): Observable<PaymentProof[]> {
    return this.http.post<PaymentProof[]>(this.url(orderId), form);
  }

  delete(orderId: number, proofId: number): Observable<void> {
    return this.http.delete<void>(`${this.url(orderId)}/${proofId}`);
  }
}