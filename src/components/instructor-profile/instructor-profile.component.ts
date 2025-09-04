import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AppUser } from '../../services/auth.service';
import { Course, CourseService } from '../../services/course.service';
import { CourseCardComponent } from '../course-card/course-card.component';

@Component({
  selector: 'app-instructor-profile',
  templateUrl: './instructor-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CourseCardComponent]
})
export class InstructorProfileComponent {
  instructor = input.required<AppUser>();
  courseService = inject(CourseService);
  
  courseSelected = output<Course>();

  instructorCourses = computed(() => {
    const instructorId = this.instructor().uid;
    return this.courseService.allCourses().filter(course => course.instructorId === instructorId);
  });

  onCourseClicked(course: Course) {
    this.courseSelected.emit(course);
  }
}
