
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { HeroComponent } from './components/hero/hero.component';
import { StatsComponent } from './components/stats/stats.component';
import { CoursesSectionComponent } from './components/courses-section/courses-section.component';
import { FooterComponent } from './components/footer/footer.component';
import { LearningPathsComponent } from './components/learning-paths/learning-paths.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { TermsConditionsComponent } from './components/terms-conditions/terms-conditions.component';
import { JoinInstructorComponent } from './components/join-instructor/join-instructor.component';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { AuthService, AppUser } from './services/auth.service';
import { CourseDetailComponent } from './components/course-detail/course-detail.component';
import { SearchService } from './services/search.service';
import { CourseService, Course } from './services/course.service';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { InstructorDashboardComponent } from './components/instructor-dashboard/instructor-dashboard.component';
import { InstructorProfileComponent } from './components/instructor-profile/instructor-profile.component';

type Page = 'home' | 'learning-paths' | 'privacy' | 'terms' | 'join' | 'login' | 'signup' | 'course-detail' | 'admin-dashboard' | 'instructor-dashboard' | 'instructor-profile';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeaderComponent,
    HeroComponent,
    StatsComponent,
    CoursesSectionComponent,
    FooterComponent,
    LearningPathsComponent,
    PrivacyPolicyComponent,
    TermsConditionsComponent,
    JoinInstructorComponent,
    LoginComponent,
    SignupComponent,
    CourseDetailComponent,
    AdminDashboardComponent,
    InstructorDashboardComponent,
    InstructorProfileComponent
  ],
  providers: [AuthService, SearchService, CourseService],
})
export class AppComponent {
  currentPage = signal<Page>('home');
  selectedCourse = signal<Course | null>(null);
  selectedInstructor = signal<AppUser | null>(null);

  showHome() {
    this.currentPage.set('home');
    window.scrollTo(0, 0);
  }

  showLearningPaths() {
    this.currentPage.set('learning-paths');
    window.scrollTo(0, 0);
  }

  showPrivacy() {
    this.currentPage.set('privacy');
    window.scrollTo(0, 0);
  }

  showTerms() {
    this.currentPage.set('terms');
    window.scrollTo(0, 0);
  }

  showJoin() {
    this.currentPage.set('join');
    window.scrollTo(0, 0);
  }

  showLogin() {
    this.currentPage.set('login');
    window.scrollTo(0, 0);
  }

  showSignup() {
    this.currentPage.set('signup');
    window.scrollTo(0, 0);
  }
  
  showCourseDetail(course: Course) {
    this.selectedCourse.set(course);
    this.currentPage.set('course-detail');
    window.scrollTo(0, 0);
  }

  showAdminDashboard() {
    this.currentPage.set('admin-dashboard');
    window.scrollTo(0, 0);
  }
  
  showInstructorDashboard() {
    this.currentPage.set('instructor-dashboard');
    window.scrollTo(0, 0);
  }
  
  showInstructorProfile(instructor: AppUser) {
    this.selectedInstructor.set(instructor);
    this.currentPage.set('instructor-profile');
    window.scrollTo(0, 0);
  }

  onAuthSuccess() {
    this.showHome();
  }
}