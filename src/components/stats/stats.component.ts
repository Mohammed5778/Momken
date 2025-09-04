
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface Stat {
  value: string;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsComponent {
  stats = signal<Stat[]>([
    { value: '435,119', title: 'متعلم عربي', subtitle: 'من أنحاء العالم' },
    { value: '400+', title: 'دورة تدريبية', subtitle: 'في مختلف المجالات' },
    { value: '205,981', title: 'شهادة', subtitle: 'تم اصدارها للمتعلمين' },
    { value: '50,915,413', title: 'دقيقة مشاهدة', subtitle: 'على المنصة' },
  ]);
}
