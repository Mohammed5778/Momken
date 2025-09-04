import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Course } from '../../services/course.service';

@Component({
  selector: 'app-course-card',
  templateUrl: './course-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCardComponent {
  course = input.required<Course>();
  courseClicked = output<Course>();
}
