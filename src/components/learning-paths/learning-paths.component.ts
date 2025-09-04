
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { LearningPathCardComponent, LearningPath } from '../learning-path-card/learning-path-card.component';

@Component({
  selector: 'app-learning-paths',
  templateUrl: './learning-paths.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LearningPathCardComponent],
})
export class LearningPathsComponent {
  learningPaths = signal<LearningPath[]>([
    {
      title: 'مصمم سوشيال ميديا',
      subtitle: 'تعلم لتصبح',
      image: 'https://picsum.photos/seed/socialmedia-icons/400/300',
      courseCount: 11,
      bgColor: 'bg-emerald-500',
    },
    {
      title: 'التعديل الاحترافي على الصور',
      subtitle: 'تعلم',
      image: 'https://picsum.photos/seed/photo-retouching/400/300',
      courseCount: 3,
      bgColor: 'bg-sky-500',
    },
    {
      title: 'مصمم جرافيك من البداية',
      subtitle: 'تعلم لتصبح',
      image: 'https://picsum.photos/seed/graphic-pen-tool/400/300',
      courseCount: 13,
      bgColor: 'bg-purple-500',
    },
    {
      title: 'مطور واجهات أمامية (Frontend)',
      subtitle: 'تعلم لتصبح',
      image: 'https://picsum.photos/seed/frontend-code/400/300',
      courseCount: 15,
      bgColor: 'bg-rose-500',
    },
    {
      title: 'مسوق رقمي محترف',
      subtitle: 'تعلم لتصبح',
      image: 'https://picsum.photos/seed/digital-marketing-charts/400/300',
      courseCount: 9,
      bgColor: 'bg-amber-500',
    },
    {
      title: 'خبير تحليل بيانات',
      subtitle: 'تعلم لتصبح',
      image: 'https://picsum.photos/seed/data-analyst-graphs/400/300',
      courseCount: 7,
      bgColor: 'bg-indigo-500',
    },
  ]);
}
