import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TikTokData, TiktokService} from '../../services/tiktok/tiktok.service';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-social-news',
  imports: [CommonModule],
  templateUrl: './social-news.html',
  styleUrl: './social-news.scss',
})
export class SocialNews implements OnInit {
// TUS VIDEOS AQUÍ:

  videoUrls = [
    'https://www.tiktok.com/@glossy.pe/video/7611005546996436244?is_from_webapp=1&sender_device=pc&web_id=7610210035554174484',
    'https://www.tiktok.com/@glossy.pe/video/7608412047348337941?is_from_webapp=1&sender_device=pc&web_id=7610210035554174484', // Ejemplo
    'https://www.tiktok.com/@glossy.pe/video/7594222084914515220?is_from_webapp=1&sender_device=pc&web_id=7555962752482788871', // Repetido para ejemplo
    'https://www.tiktok.com/@glossy.pe/video/7606186637378227477?is_from_webapp=1&sender_device=pc&web_id=7555962752482788871'  // Repetido para ejemplo
  ];

  posts: (TikTokData & { tapeColor: string; rotation: string })[] = [];
  isLoading = true;

  // Colores playeros para el "Washi Tape"
  tapeColors = ['#FFB7B2', '#88B3C8', '#FDE68A', '#bef264'];
  // Rotaciones para el desorden
  rotations = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

  constructor(private tiktokService: TiktokService) {}

  ngOnInit() {
    this.tiktokService.getTikToks(this.videoUrls).subscribe({
      next: (data) => {
        this.posts = data.map((post, index) => ({
          ...post,
          // Asignar estilo cíclico
          tapeColor: this.tapeColors[index % this.tapeColors.length],
          rotation: this.rotations[index % this.rotations.length]
        }));
        this.isLoading = false;
        console.log(this.posts);
      },
      error: (err) => {
        console.error('Error cargando TikToks:', err);
        this.isLoading = false;
      }
    });
  }
}
