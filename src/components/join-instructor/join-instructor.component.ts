
import { ChangeDetectionStrategy, Component, signal, inject, ViewChild, ElementRef, computed, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { supabaseClient } from '../../supabase.client';
import { CourseService } from '../../services/course.service';


type ApplicationPage = 'form' | 'interview' | 'writtenInterview' | 'submitting' | 'success' | 'error' | 'alreadyApplied';
type RecordingState = 'idle' | 'recording' | 'finished';

interface InterviewQuestion {
  id: number;
  text: string;
}

interface VideoAnswer {
  questionId: number;
  file?: File;
  url?: string;
  recordingState: RecordingState;
}

@Component({
  selector: 'app-join-instructor',
  templateUrl: './join-instructor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinInstructorComponent implements OnDestroy {
  authService = inject(AuthService);
  courseService = inject(CourseService);
  currentUser = this.authService.currentUser;
  
  page = signal<ApplicationPage>('form');
  errorMessage = signal('');
  
  // Form state
  selectedCvFile = signal<File | null>(null);
  private applicationFormData: FormData | null = null;
  
  // Interview state
  @ViewChild('videoPlayer') videoPlayer?: ElementRef<HTMLVideoElement>;
  interviewQuestions = signal<InterviewQuestion[]>([
    { id: 1, text: 'عرف عن نفسك وخبراتك في المجال الذي اخترته.' },
    { id: 2, text: 'لماذا ترغب في أن تصبح محاضرًا في منصة "ممكن"؟' },
    { id: 3, text: 'اشرح مفهومًا معقدًا في مجالك كما لو كنت تشرحه لطالب مبتدئ.' },
  ]);
  currentQuestionIndex = signal(0);
  videoAnswers = signal<VideoAnswer[]>([]);
  writtenAnswers = signal<string[]>(['', '', '']);
  
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  isCameraReady = signal(false);
  cameraError = signal(false);

  currentQuestion = computed(() => this.interviewQuestions()[this.currentQuestionIndex()]);
  currentAnswer = computed(() => this.videoAnswers().find(a => a.questionId === this.currentQuestion()?.id));
  isLastQuestion = computed(() => this.currentQuestionIndex() === this.interviewQuestions().length - 1);
  canSubmitVideo = computed(() => this.videoAnswers().length === this.interviewQuestions().length && this.videoAnswers().every(a => a.file));
  canSubmitWritten = computed(() => this.writtenAnswers().every(a => a && a.trim().length > 5));


  constructor() {
    this.videoAnswers.set(this.interviewQuestions().map(q => ({
      questionId: q.id,
      recordingState: 'idle'
    })));
  }

  handleCvFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.selectedCvFile.set(input.files[0]);
    }
  }

  async startApplicationProcess(method: 'video' | 'written', form: HTMLFormElement) {
    if (!this.currentUser()) {
      this.errorMessage.set('يجب عليك تسجيل الدخول أولاً لتقديم طلب.');
      return;
    }
    
    this.applicationFormData = new FormData(form);

    // Check if user has already applied
    const { data, error } = await supabaseClient
      .from('instructor_applications')
      .select('id')
      .eq('user_id', this.currentUser()!.uid)
      .limit(1);

    if (error) {
      this.errorMessage.set('حدث خطأ أثناء التحقق من طلبك السابق.');
      this.page.set('error');
      return;
    }

    if (data && data.length > 0) {
      this.page.set('alreadyApplied');
      return;
    }
    
    if (method === 'video') {
      this.page.set('interview');
      this.setupCamera();
    } else {
      this.page.set('writtenInterview');
    }
  }

  async setupCamera() {
    this.cameraError.set(false);
    this.errorMessage.set('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (this.videoPlayer?.nativeElement) {
        this.videoPlayer.nativeElement.srcObject = stream;
      }
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      this.mediaRecorder.onstop = () => {
        const videoBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const videoFile = new File([videoBlob], `answer_${this.currentQuestion().id}.webm`, { type: 'video/webm' });
        this.updateAnswer(this.currentQuestion().id, { file: videoFile, recordingState: 'finished' });
        this.recordedChunks = [];
      };
      this.isCameraReady.set(true);
    } catch (err: any) {
      console.error('Camera error:', err.name, err.message);
       if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           this.errorMessage.set('تم رفض الوصول إلى الكاميرا. يرجى السماح بالوصول في إعدادات متصفحك ثم حاول مرة أخرى.');
       } else {
           this.errorMessage.set('لم نتمكن من الوصول إلى الكاميرا. يرجى التأكد من توصيلها ومنح الإذن والمحاولة مرة أخرى.');
       }
      this.isCameraReady.set(false);
      this.cameraError.set(true);
    }
  }
  
  retryCameraSetup() {
    this.setupCamera();
  }
  
  startRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'recording') return;
    this.recordedChunks = [];
    this.mediaRecorder.start();
    this.updateAnswer(this.currentQuestion().id, { recordingState: 'recording' });
  }

  stopRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;
    this.mediaRecorder.stop();
  }

  retakeVideo() {
    this.updateAnswer(this.currentQuestion().id, { recordingState: 'idle', file: undefined });
  }

  nextQuestion() {
    if (!this.isLastQuestion()) {
      this.currentQuestionIndex.update(i => i + 1);
    }
  }

  updateWrittenAnswer(index: number, event: Event) {
    const newAnswer = (event.target as HTMLTextAreaElement).value;
    this.writtenAnswers.update(answers => {
        const newAnswers = [...answers];
        newAnswers[index] = newAnswer;
        return newAnswers;
    });
  }

  async submitWrittenApplication() {
    this.page.set('submitting');
    this.errorMessage.set('');

    const formData = this.applicationFormData;
    const cvFile = this.selectedCvFile();
    
    try {
      if (!formData) throw new Error('بيانات النموذج مفقودة. يرجى إعادة المحاولة.');
      if (!cvFile) throw new Error('يرجى رفع سيرتك الذاتية.');
      if (!this.canSubmitWritten()) throw new Error('يرجى الإجابة على جميع الأسئلة.');

      const cvUrl = await this.courseService.uploadFile(cvFile, 'cvs');
      
      const writtenAnswersForDb = this.interviewQuestions().map((q, i) => ({
        question: q.text,
        answer: this.writtenAnswers()[i]
      }));

      const { error } = await supabaseClient.from('instructor_applications').insert([{
        user_id: this.currentUser()!.uid,
        cv_url: cvUrl,
        linkedin_url: formData.get('linkedin') as string,
        bio: formData.get('bio') as string,
        expertise_field: formData.get('expertise_field') as string,
        video_answers: writtenAnswersForDb,
        status: 'pending'
      }]);

      if (error) throw error;
      this.page.set('success');

    } catch (error: any) {
      console.error('Submission error:', error);
      this.errorMessage.set(error.message || 'حدث خطأ غير متوقع أثناء إرسال طلبك.');
      this.page.set('error');
    }
  }

  async submitFinalApplication() {
    this.page.set('submitting');
    this.errorMessage.set('');
    
    const formData = this.applicationFormData;
    const cvFile = this.selectedCvFile();

    try {
      if (!formData) throw new Error('بيانات النموذج مفقودة. يرجى إعادة المحاولة.');
      if (!cvFile) throw new Error('يرجى رفع سيرتك الذاتية.');
      if (!this.canSubmitVideo()) throw new Error('يرجى الإجابة على جميع الأسئلة.');
      
      const cvUrl = await this.courseService.uploadFile(cvFile, 'cvs');
      
      const videoUploadPromises = this.videoAnswers().map(answer => 
        this.courseService.uploadFile(answer.file!, 'interview-videos')
      );
      const videoUrls = await Promise.all(videoUploadPromises);
      
      const videoAnswersForDb = this.interviewQuestions().map((q, i) => ({
        question: q.text,
        url: videoUrls[i]
      }));

      const { error } = await supabaseClient.from('instructor_applications').insert([{
        user_id: this.currentUser()!.uid,
        cv_url: cvUrl,
        linkedin_url: formData.get('linkedin') as string,
        bio: formData.get('bio') as string,
        expertise_field: formData.get('expertise_field') as string,
        video_answers: videoAnswersForDb,
        status: 'pending'
      }]);

      if (error) throw error;

      this.page.set('success');
    } catch (error: any) {
      console.error('Submission error:', error);
      this.errorMessage.set(error.message || 'حدث خطأ غير متوقع أثناء إرسال طلبك.');
      this.page.set('error');
    }
  }
  
  private updateAnswer(questionId: number, data: Partial<VideoAnswer>) {
    this.videoAnswers.update(answers => 
      answers.map(a => a.questionId === questionId ? { ...a, ...data } : a)
    );
  }

  ngOnDestroy() {
    if (this.mediaRecorder && this.mediaRecorder.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }
}
