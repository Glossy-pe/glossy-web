import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import {forkJoin, map, Observable} from 'rxjs';

export interface TikTokData {
  title: string;
  thumbnail_url: string;
  author_name: string;
  video_url: string; // La URL original para el enlace
}

@Injectable({
  providedIn: 'root'
})
export class TiktokService {
  private oembedUrl = 'https://www.tiktok.com/oembed';

  constructor(private http: HttpClient) {}

  getTikToks(urls: string[]): Observable<TikTokData[]> {
    const requests = urls.map(url =>
      this.http.get<any>(`${this.oembedUrl}?url=${url}`).pipe(
        map(response => ({
          title: response.title || 'Ver video en TikTok', // TikTok a veces devuelve título vacío
          thumbnail_url: response.thumbnail_url,
          author_name: response.author_name,
          video_url: url
        }))
      )
    );
    return forkJoin(requests);
  }
}
