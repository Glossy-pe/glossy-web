import { Pipe, PipeTransform } from '@angular/core';
import { cfImage } from '../utils/image-url';

@Pipe({ name: 'cfImage', standalone: true })
export class CfImagePipe implements PipeTransform {
  transform(url: string | null | undefined, width: number): string {
    return cfImage(url, width);
  }
}