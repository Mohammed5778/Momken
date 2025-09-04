import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CourseService, Lesson } from '../../services/course.service';
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

  async submitCourse(event: Event) {
    event.preventDefault();
    const user = this.currentUser();
    if (!user) {
        this.errorMessage.set('يجب تسجيل الدخول لإضافة دورة.');
        return;
    }

    this.status.set('submitting');
    this.errorMessage.set('');
    this.successMessage.set('');
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const title = formData.get('title') as string;
      if (!title || !this.selectedFiles.courseImage) {
        throw new Error('يرجى ملء عنوان الدورة وتحميل صورة الدورة.');
      }
      
      const instructorImageFile = this.selectedFiles.instructorImage;

      const [courseImageUrl, instructorImageUrl, promoVideoUrl] = await Promise.all([
        this.courseService.uploadFile(this.selectedFiles.courseImage, 'course-images'),
        instructorImageFile 
          ? this.courseService.uploadFile(instructorImageFile, 'instructor-images')
          : Promise.resolve(user.photoURL), // Use profile pic if not uploaded
        this.selectedFiles.videoUrl 
          ? this.courseService.uploadFile(this.selectedFiles.videoUrl, 'course-videos')
          : Promise.resolve(undefined)
      ]);
      
      const lessonUploadPromises: Promise<string>[] = [];
      const lessonsMetadata: Omit<Lesson, 'videoUrl'>[] = [];
      
      this.lessons().forEach((lessonForm) => {
        const lessonTitle = formData.get(`lesson_title_${lessonForm.id}`) as string;
        if (lessonTitle && lessonForm.file) {
          lessonUploadPromises.push(this.courseService.uploadFile(lessonForm.file, 'lesson-videos'));
          lessonsMetadata.push({
            title: lessonTitle,
            duration: formData.get(`lesson_duration_${lessonForm.id}`) as string,
            isFree: !!formData.get(`lesson_isFree_${lessonForm.id}`),
          });
        }
      });
      
      const lessonVideoUrls = await Promise.all(lessonUploadPromises);
      
      const finalLessons: Lesson[] = lessonsMetadata.map((meta, index) => ({
        ...meta,
        videoUrl: lessonVideoUrls[index],
      }));

      const whatYouWillLearnRaw = formData.get('whatYouWillLearn') as string;
      const courseData = {
        title,
        instructorName: user.displayName || 'محاضر',
        instructorImage: instructorImageUrl || '',
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
        courseImage: courseImageUrl
      };
      
      await this.courseService.addCourse(courseData);

      this.status.set('success');
      this.successMessage.set(`تمت إضافة دورة "${title}" بنجاح!`);
      form.reset();
      this.selectedFiles = {};
      this.lessons.set([{ id: Date.now() }]);

    } catch (error: any) {
      console.error('Failed to submit course', error);
      this.status.set('error');
      this.errorMessage.set(error.message || 'حدث خطأ غير متوقع أثناء إضافة الدورة.');
    }
  }
}
