

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
  title?: string;
  duration?: string;
  isFree?: boolean;
  videoUrl?: string;
}

interface InstructorApplication {
  id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  cv_url: string;
  linkedin_url: string;
  bio: string;
  expertise_field: string;
  video_answers: { question: string; url?: string, answer?: string }[];
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
  editingCourse = signal<Course | null>(null);
  allCourses = this.courseService.allCourses;
  
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
    this.errorMessage.set('');
    try {
      const { data: applicationsData, error: applicationsError } = await supabaseClient
        .from('instructor_applications')
        .select('id, user_id, created_at, status, cv_url, linkedin_url, bio, expertise_field, video_answers')
        .order('created_at', { ascending: false });

      if (applicationsError) {
        throw new Error(`Supabase error fetching applications: ${applicationsError.message}`);
      }

      if (!applicationsData || applicationsData.length === 0) {
        this.applications.set([]);
        return; 
      }

      const userIds = [...new Set(applicationsData.map(app => app.user_id).filter(Boolean))];

      if (userIds.length === 0) {
        const appsWithoutUsers = applicationsData.map(app => ({
          ...app,
          user: { id: '', full_name: 'User ID Missing', avatar_url: '' }
        }));
        this.applications.set(appsWithoutUsers as any);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        throw new Error(`Supabase error fetching profiles: ${profilesError.message}`);
      }
      
      const profilesMap = new Map(profilesData.map(profile => [profile.id, profile]));

      const combinedData = applicationsData.map(app => {
        const userProfile = profilesMap.get(app.user_id);
        return {
          ...app,
          user: userProfile || { id: app.user_id, full_name: 'Profile Not Found', avatar_url: '' }
        };
      });

      this.applications.set(combinedData as any);
    } catch (e: any) {
      console.error(e);
      this.errorMessage.set(`An error occurred while fetching applications: ${e.message}. Check Supabase RLS policies.`);
      this.applications.set([]);
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
    const { error: appError } = await supabaseClient
      .from('instructor_applications')
      .update({ status: newStatus })
      .eq('id', applicationId);
    
    if (appError) {
      this.errorMessage.set(`Failed to update application: ${appError.message}`);
      return;
    }

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

  editCourse(course: Course, form: HTMLFormElement) {
    this.editingCourse.set(course);
    this.status.set('idle');
    this.errorMessage.set('');
    this.successMessage.set('');
    this.lessons.set(course.lessons?.map(l => ({ ...l, id: Date.now() + Math.random() })) || [{ id: Date.now() }]);
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

  async updateCourseStatus(course: Course, status: 'published' | 'archived' | 'draft') {
    try {
        await this.courseService.updateCourse(course.id, { status });
        this.successMessage.set('تم تحديث حالة الدورة بنجاح.');
    } catch(e: any) {
        this.errorMessage.set(e.message);
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
    const editing = this.editingCourse();

    try {
      const title = formData.get('title') as string;
      const instructorName = formData.get('instructorName') as string;

      if (!title || (!editing && !instructorName)) {
        throw new Error('يرجى ملء جميع الحقول المطلوبة.');
      }
      if (!editing && !this.selectedFiles.courseImage) {
        throw new Error('يرجى تحميل صورة للدورة.');
      }
      
      const courseImageFile = this.selectedFiles.courseImage;
      const instructorImageFile = this.selectedFiles.instructorImage;
      const promoVideoFile = this.selectedFiles.videoUrl;

      const [courseImageUrl, instructorImageUrl, promoVideoUrl] = await Promise.all([
        courseImageFile ? this.courseService.uploadFile(courseImageFile, 'course-images') : Promise.resolve(editing?.courseImage),
        instructorImageFile ? this.courseService.uploadFile(instructorImageFile, 'instructor-images') : Promise.resolve(editing?.instructorImage || user.photoURL || ''),
        promoVideoFile ? this.courseService.uploadFile(promoVideoFile, 'course-videos') : Promise.resolve(editing?.videoUrl)
      ]);
      
      const lessonUploadPromises: Promise<Lesson | null>[] = this.lessons().map(async (lessonForm) => {
        const lessonTitle = (form.elements.namedItem(`lesson_title_${lessonForm.id}`) as HTMLInputElement)?.value;
        if (!lessonTitle) return null;

        let videoUrl = lessonForm.videoUrl;
        if (lessonForm.file) {
           videoUrl = await this.courseService.uploadFile(lessonForm.file, 'lesson-videos');
        }

        return {
          title: lessonTitle,
          duration: (form.elements.namedItem(`lesson_duration_${lessonForm.id}`) as HTMLInputElement)?.value,
          isFree: (form.elements.namedItem(`lesson_isFree_${lessonForm.id}`) as HTMLInputElement)?.checked,
          videoUrl: videoUrl || '',
        };
      });
      
      const finalLessons = (await Promise.all(lessonUploadPromises)).filter((l): l is Lesson => l !== null);
      const whatYouWillLearnRaw = formData.get('whatYouWillLearn') as string;
      
      const courseData: Partial<Course> = {
        title,
        instructorName: editing ? editing.instructorName : instructorName,
        courseImage: courseImageUrl,
        instructorImage: instructorImageUrl,
        videoUrl: promoVideoUrl,
        category: formData.get('category') as string,
        duration: formData.get('duration') as string,
        level: formData.get('level') as string,
        lessonsCount: finalLessons.length,
        description: formData.get('description') as string,
        whatYouWillLearn: whatYouWillLearnRaw.split('\n').filter(line => line.trim() !== ''),
        hasCertificate: !!(formData.get('hasCertificate')),
        lessons: finalLessons,
        instructorId: editing ? editing.instructorId : user.uid,
        status: editing ? editing.status : 'published'
      };
      
      if (editing) {
        await this.courseService.updateCourse(editing.id, courseData);
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
      this.errorMessage.set(error.message || 'حدث خطأ غير متوقع أثناء حفظ الدورة.');
    }
  }
}
