
import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { Course, CourseService, Lesson } from '../../services/course.service';
import { AuthService } from '../../services/auth.service';

type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

interface SelectedFiles {
  courseImage?: File;
  instructorImage?: File;
  videoUrl?: File;
}

interface LessonFormData {
  id: number;
  file?: File;
  title?: string;
  duration?: string;
  isFree?: boolean;
  videoUrl?: string;
}

@Component({
  selector: 'app-instructor-dashboard',
  templateUrl: './instructor-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorDashboardComponent {
  courseService = inject(CourseService);
  authService = inject(AuthService);
  currentUser = this.authService.currentUser;
  
  status = signal<SubmissionStatus>('idle');
  errorMessage = signal('');
  successMessage = signal('');
  editingCourse = signal<Course | null>(null);

  categories = signal<string[]>([
    'الرسم والتصميم', 'التسويق', 'تكنولوجيا المعلومات', 'الأعمال', 'التصوير وصناعة الأفلام', 'اللغات', 'الموارد البشرية'
  ]);
  levels = signal<string[]>(['مبتدئ', 'متوسط', 'متقدم', 'كل المستويات']);
  
  selectedFiles: SelectedFiles = {};
  lessons = signal<LessonFormData[]>([]);
  
  instructorCourses = computed(() => {
     const user = this.currentUser();
     if (!user) return [];
     return this.courseService.allCourses().filter(c => c.instructorId === user.uid);
  });

  constructor() {
    this.addLesson();
  }

  addLesson() {
    this.lessons.update(lessons => [...lessons, { id: Date.now() }]);
  }

  removeLesson(id: number) {
    this.lessons.update(lessons => lessons.filter(lesson => lesson.id !== id));
  }

  handleFileChange(event: Event, fileType: keyof SelectedFiles) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFiles[fileType] = input.files[0];
    }
  }

  handleLessonFileChange(event: Event, id: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.lessons.update(lessons => 
        lessons.map(lesson => 
          lesson.id === id ? { ...lesson, file } : lesson
        )
      );
    }
  }

  async submitCourse(form: HTMLFormElement, status: 'draft' | 'published') {
    const user = this.currentUser();
    if (!user) {
        this.errorMessage.set('يجب تسجيل الدخول لإضافة دورة.');
        return;
    }

    this.status.set('submitting');
    this.errorMessage.set('');
    this.successMessage.set('');
    
    const formData = new FormData(form);

    try {
      const title = formData.get('title') as string;
      if (!title) throw new Error('يرجى ملء عنوان الدورة.');
      if (!this.selectedFiles.courseImage && !this.editingCourse()) {
        throw new Error('يرجى تحميل صورة للدورة.');
      }
      
      const courseImageFile = this.selectedFiles.courseImage;
      const promoVideoFile = this.selectedFiles.videoUrl;

      // Upload files that have been changed/added
      const courseImageUrl = courseImageFile 
        ? await this.courseService.uploadFile(courseImageFile, 'course-images')
        : this.editingCourse()?.courseImage;
      
      const promoVideoUrl = promoVideoFile
        ? await this.courseService.uploadFile(promoVideoFile, 'course-videos')
        : this.editingCourse()?.videoUrl;

      // Process lessons: upload new files, keep existing URLs
      const lessonUploadPromises: Promise<Lesson>[] = this.lessons().map(async (lessonForm) => {
        const lessonTitle = formData.get(`lesson_title_${lessonForm.id}`) as string;
        if (!lessonTitle) return null; // Skip lessons without title

        let videoUrl = lessonForm.videoUrl;
        if (lessonForm.file) {
           videoUrl = await this.courseService.uploadFile(lessonForm.file, 'lesson-videos');
        }

        return {
          title: lessonTitle,
          duration: formData.get(`lesson_duration_${lessonForm.id}`) as string,
          isFree: !!formData.get(`lesson_isFree_${lessonForm.id}`),
          videoUrl: videoUrl || '',
        };
      });

      const finalLessons = (await Promise.all(lessonUploadPromises)).filter((l): l is Lesson => l !== null);

      const whatYouWillLearnRaw = formData.get('whatYouWillLearn') as string;
      const courseData: Partial<Course> = {
        title,
        instructorName: user.displayName || 'محاضر',
        instructorImage: user.photoURL || '',
        videoUrl: promoVideoUrl,
        category: formData.get('category') as string,
        duration: formData.get('duration') as string,
        level: formData.get('level') as string,
        lessonsCount: finalLessons.length,
        description: formData.get('description') as string,
        whatYouWillLearn: whatYouWillLearnRaw.split('\n').filter(line => line.trim() !== ''),
        hasCertificate: !!(formData.get('hasCertificate')),
        lessons: finalLessons,
        instructorId: user.uid,
        courseImage: courseImageUrl,
        status: status,
      };
      
      if (this.editingCourse()) {
        await this.courseService.updateCourse(this.editingCourse()!.id, courseData);
        this.successMessage.set(`تم تحديث دورة "${title}" بنجاح!`);
      } else {
        await this.courseService.addCourse(courseData as Omit<Course, 'id' | 'rating' | 'reviewsCount'>);
        this.successMessage.set(`تمت إضافة دورة "${title}" بنجاح!`);
      }
      
      this.status.set('success');
      this.cancelEdit(form);

    } catch (error: any) {
      console.error('Failed to submit course', error);
      this.status.set('error');
      this.errorMessage.set(error.message || 'حدث خطأ غير متوقع أثناء إضافة الدورة.');
    }
  }

  editCourse(course: Course, form: HTMLFormElement) {
    this.editingCourse.set(course);
    this.lessons.set(course.lessons.map(l => ({ ...l, id: Date.now() + Math.random() })) || [{ id: Date.now() }]);
    this.selectedFiles = {};
    form.scrollIntoView({ behavior: 'smooth' });
  }

  cancelEdit(form: HTMLFormElement) {
    this.editingCourse.set(null);
    form.reset();
    this.selectedFiles = {};
    this.lessons.set([{ id: Date.now() }]);
  }

  async deleteCourse(course: Course) {
    if (confirm(`هل أنت متأكد من حذف دورة "${course.title}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
        try {
            await this.courseService.deleteCourse(course.id);
            this.successMessage.set('تم حذف الدورة بنجاح.');
        } catch(e: any) {
            this.errorMessage.set(e.message);
        }
    }
  }

  async toggleArchive(course: Course) {
    const newStatus = course.status === 'archived' ? 'published' : 'archived';
    try {
        await this.courseService.updateCourse(course.id, { status: newStatus });
        this.successMessage.set('تم تحديث حالة الدورة بنجاح.');
    } catch(e: any) {
        this.errorMessage.set(e.message);
    }
  }
}