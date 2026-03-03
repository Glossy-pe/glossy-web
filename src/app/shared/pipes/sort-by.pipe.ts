import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'sortBy', standalone: true })
export class SortByPipe implements PipeTransform {
  transform<T>(array: T[], field: keyof T): T[] {
    return [...array].sort((a, b) => (a[field] as number) - (b[field] as number));
  }
}