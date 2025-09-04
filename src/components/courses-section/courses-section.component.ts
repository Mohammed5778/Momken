import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { CourseCardComponent } from '../course-card/course-card.component';
import { SearchService } from '../../services/search.service';
import { Course, CourseService } from '../../services/course.service';

@Component({
  selector: 'app-courses-section',
  imports: [CourseCardComponent],
  templateUrl: './courses-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesSectionComponent {
  courseSelected = output<Course>();
  searchService = inject(SearchService);
  courseService = inject(CourseService);
  
  searchTerm = this.searchService.searchTerm;
  allCourses = this.courseService.allCourses;

  categories = signal<string[]>([
    'كل الأقسام', 'الرسم والتصميم', 'التسويق', 'تكنولوجيا المعلومات', 'الأعمال', 'التصوير وصناعة الأفلام', 'اللغات', 'الموارد البشرية'
  ]);
  
  selectedCategory = signal<string>('كل الأقسام');
  visibleCoursesCount = signal(6);

  filteredCourses = computed(() => {
    const category = this.selectedCategory();
    const term = this.searchTerm().toLowerCase();
    
    let courses = this.allCourses();

    if (category !== 'كل الأقسام') {
      courses = courses.filter(course => course.category === category);
    }
    
    if (term) {
        courses = courses.filter(course => 
            course.title.toLowerCase().includes(term) ||
            course.instructorName.toLowerCase().includes(term)
        );
    }

    return courses;
  });

  displayedCourses = computed(() => {
    return this.filteredCourses().slice(0, this.visibleCoursesCount());
  });

  hasMoreCourses = computed(() => {
    return this.visibleCoursesCount() < this.filteredCourses().length;
  });

  selectCategory(category: string) {
    this.selectedCategory.set(category);
    this.visibleCoursesCount.set(6); // Reset on category change
  }

  loadMore() {
    this.visibleCoursesCount.update(count => count + 6);
  }

  onCourseClicked(course: Course) {
    this.courseSelected.emit(course);
  }
}