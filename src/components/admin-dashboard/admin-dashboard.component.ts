import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CourseService, Lesson } from '../../services/course.service';
import { AuthService, AppUser } from '../../services/auth.service';
import { supabaseClient } from '../../supabase.client';
import { Course } from '../../services/course.service';

type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';
type AdminPage = 'courses' | 'applications' | 'instructors';

interface SelectedFiles {
  courseImage?: File;
  instructorImage?: File;
  videoUrl?: File;
}

interface LessonFormData {
  id: number;
  file?: File;
}

interface InstructorApplication {
  id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  cv_url: string;
  linkedin_url: string;
  bio: string;
  expertise_field: string;
  video_answers: { question: string; url: string }[];
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  courseService = inject(CourseService);
  authService = inject(AuthService);
  currentUser = this.authService.currentUser;
  
  currentPage = signal<AdminPage>('courses');
  status = signal<SubmissionStatus>('idle');
  errorMessage = signal('');
  successMessage = signal('');

  // Course form state
  categories = signal<string[]>(['الرسم والتصميم', 'التسويق', 'تكنولوجيا المعلومات', 'الأعمال', 'التصوير وصناعة الأفلام', 'اللغات', 'الموارد البشرية']);
  levels = signal<string[]>(['مبتدئ', 'متوسط', 'متقدم', 'كل المستويات']);
  selectedFiles: SelectedFiles = {};
  lessons = signal<LessonFormData[]>([]);
  
  // Applications state
  applications = signal<InstructorApplication[]>([]);
  selectedApplication = signal<InstructorApplication | null>(null);

  // Instructors state
  instructors = signal<AppUser[]>([]);
  showNotificationModal = signal(false);
  notificationTarget = signal<AppUser | null>(null);

  // DERIVED STATE
  pendingApplicationsCount = computed(() => {
    return this.applications().filter(app => app.status === 'pending').length;
  });

  coursesForNotificationTarget = computed(() => {
    const target = this.notificationTarget();
    if (!target) {
      return [];
    }
    return this.courseService.allCourses().filter(c => c.instructorId === target.uid);
  });

  constructor() {
    this.addLesson();
    this.loadAdminData();
  }

  async loadAdminData() {
    this.fetchApplications();
    this.fetchInstructors();
  }

  async fetchApplications() {
    const { data, error } = await supabaseClient
      .from('instructor_applications')
      .select(`*, user:profiles(id, full_name, avatar_url)`)
      .order('created_at', { ascending: false });
    if (data) {
      this.applications.set(data as any);
    }
  }

  async fetchInstructors() {
     const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('role', 'instructor');
    if (data) {
      this.instructors.set(data as AppUser[]);
    }
  }

  async handleApplication(applicationId: string, userId: string, newStatus: 'approved' | 'rejected') {
    // 1. Update application status
    const { error: appError } = await supabaseClient
      .from('instructor_applications')
      .update({ status: newStatus })
      .eq('id', applicationId);
    
    if (appError) {
      this.errorMessage.set(`Failed to update application: ${appError.message}`);
      return;
    }

    // 2. If approved, update user role
    if (newStatus === 'approved') {
      const { error: roleError } = await supabaseClient
        .from('profiles')
        .update({ role: 'instructor' })
        .eq('id', userId);

      if (roleError) {
        this.errorMessage.set(`Failed to update user role: ${roleError.message}`);
        return;
      }
    }

    // 3. Refresh data
    this.successMessage.set(`Application has been ${newStatus}.`);
    this.selectedApplication.set(null);
    this.fetchApplications();
    this.fetchInstructors();
  }

  async suspendInstructor(instructor: AppUser) {
    if (confirm(`هل أنت متأكد من أنك تريد حظر المحاضر ${instructor.displayName}؟ سيتم تحويل حسابه إلى مستخدم عادي.`)) {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', instructor.uid);
      
      if (error) {
        this.errorMessage.set(`Failed to suspend instructor: ${error.message}`);
      } else {
        this.successMessage.set(`${instructor.displayName} has been suspended.`);
        this.fetchInstructors();
      }
    }
  }

  openNotificationModal(instructor: AppUser) {
    this.notificationTarget.set(instructor);
    this.showNotificationModal.set(true);
  }

  async sendNotification(event: Event) {
    event.preventDefault();
    const target = this.notificationTarget();
    if (!target) return;

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const message = formData.get('message') as string;
    const courseId = formData.get('courseId') as string;
    
    if (!message) return;

    const { error } = await supabaseClient.from('notifications').insert({
      user_id: target.uid,
      message: message,
      course_id: courseId || null,
    });

    if (error) {
      this.errorMessage.set(`Failed to send notification: ${error.message}`);
    } else {
      this.successMessage.set(`Notification sent to ${target.displayName}.`);
      this.showNotificationModal.set(false);
    }
  }

  // Course Management Methods
  addLesson() { this.lessons.update(l => [...l, { id: Date.now() }]); }
  removeLesson(id: number) { this.lessons.update(l => l.filter(les => les.id !== id)); }
  handleFileChange(event: Event, fileType: keyof SelectedFiles) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) { this.selectedFiles[fileType] = input.files[0]; }
  }
  handleLessonFileChange(event: Event, id: number) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.lessons.update(l => l.map(les => les.id === id ? { ...les, file: input.files![0] } : les));
    }
  }

  async submitCourse(event: Event) {
    event.preventDefault();
    const user = this.currentUser();
    if (!user) { this.errorMessage.set('An authenticated user must create a course.'); return; }
    
    this.status.set('submitting');
    this.errorMessage.set('');
    this.successMessage.set('');
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const title = formData.get('title') as string;
      const instructorName = formData.get('instructorName') as string;
      const instructorImageFile = this.selectedFiles.instructorImage;

      if (!title || !instructorName || !this.selectedFiles.courseImage) {
        throw new Error('يرجى ملء جميع الحقول المطلوبة وتحميل الصور الأساسية.');
      }

      const [courseImageUrl, instructorImageUrl, promoVideoUrl] = await Promise.all([
        this.courseService.uploadFile(this.selectedFiles.courseImage, 'course-images'),
        instructorImageFile ? this.courseService.uploadFile(instructorImageFile, 'instructor-images') : Promise.resolve(user.photoURL || ''),
        this.selectedFiles.videoUrl ? this.courseService.uploadFile(this.selectedFiles.videoUrl, 'course-videos') : Promise.resolve(undefined)
      ]);
      
      const lessonUploadPromises: Promise<string>[] = [];
      const lessonsMetadata: Omit<Lesson, 'videoUrl'>[] = [];

      this.lessons().forEach((lessonForm) => {
        const lessonTitle = formData.get(`lesson_title_${lessonForm.id}`) as string;
        if (lessonTitle && lessonForm.file) {
          lessonUploadPromises.push(this.courseService.uploadFile(lessonForm.file, 'lesson-videos'));
          lessonsMetadata.push({ title: lessonTitle, duration: formData.get(`lesson_duration_${lessonForm.id}`) as string, isFree: !!formData.get(`lesson_isFree_${lessonForm.id}`) });
        }
      });
      
      const lessonVideoUrls = await Promise.all(lessonUploadPromises);
      const finalLessons: Lesson[] = lessonsMetadata.map((meta, index) => ({ ...meta, videoUrl: lessonVideoUrls[index] }));
      const whatYouWillLearnRaw = formData.get('whatYouWillLearn') as string;
      
      const courseData: Omit<Course, 'id' | 'rating' | 'reviewsCount'> = {
        title, instructorName, courseImage: courseImageUrl, instructorImage: instructorImageUrl, videoUrl: promoVideoUrl,
        category: formData.get('category') as string,
        duration: formData.get('duration') as string,
        level: formData.get('level') as string,
        lessonsCount: finalLessons.length,
        description: formData.get('description') as string,
        whatYouWillLearn: whatYouWillLearnRaw.split('\n').filter(line => line.trim() !== ''),
        hasCertificate: !!(formData.get('hasCertificate')),
        lessons: finalLessons,
        instructorId: user.uid
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