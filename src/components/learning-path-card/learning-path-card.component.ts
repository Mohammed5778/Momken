
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface LearningPath {
  title: string;
  subtitle: string;
  image: string;
  courseCount: number;
  bgColor: string;
}

@Component({
  selector: 'app-learning-path-card',
  templateUrl: './learning-path-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningPathCardComponent {
  path = input.required<LearningPath>();
}
