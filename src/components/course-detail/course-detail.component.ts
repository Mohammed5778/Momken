import { ChangeDetectionStrategy, Component, input, output, signal, computed, inject } from '@angular/core';
import { Course, CourseService, Lesson } from '../../services/course.service';
import { CourseCardComponent } from '../course-card/course-card.component';
import { DecimalPipe } from '@angular/common';
import { AppUser } from '../../services/auth.service';

@Component({
  selector: 'app-course-detail',
  templateUrl: './course-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CourseCardComponent, DecimalPipe]
})
export class CourseDetailComponent {
  course = input.required<Course>();
  courseService = inject(CourseService);
  
  navigateToCourse = output<Course>();
  navigateToInstructorProfile = output<AppUser>();

  isVideoPlayerVisible = signal(false);
  activeVideoUrl = signal('');

  relatedCourses = computed(() => {
    const currentCourse = this.course();
    if (!currentCourse) return [];
    
    return this.courseService.allCourses()
      .filter(c => c.category === currentCourse.category && c.id !== currentCourse.id)
      .slice(0, 3);
  });

  playVideo(url?: string) {
    const videoUrl = url || this.course()?.videoUrl;
    if (videoUrl) {
      this.activeVideoUrl.set(videoUrl);
      this.isVideoPlayerVisible.set(true);
    }
  }

  closePlayer() {
    this.isVideoPlayerVisible.set(false);
    this.activeVideoUrl.set('');
  }

  onRelatedCourseClicked(course: Course) {
    this.navigateToCourse.emit(course);
  }

  onInstructorClicked(instructor?: AppUser) {
    if (instructor) {
      this.navigateToInstructorProfile.emit(instructor);
    }
  }
}
