import { ChangeDetectionStrategy, Component, inject, output, signal, effect, ElementRef } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { SearchService } from '../../services/search.service';
import { supabaseClient } from '../../supabase.client';

export interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  course_id: string | null;
  lesson_title: string | null;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class HeaderComponent {
  navigateToHome = output<void>();
  navigateToPaths = output<void>();
  navigateToLogin = output<void>();
  navigateToSignup = output<void>();
  navigateToAdminDashboard = output<void>();
  navigateToInstructorDashboard = output<void>();
  navigateToJoin = output<void>();

  authService = inject(AuthService);
  searchService = inject(SearchService);
  currentUser = this.authService.currentUser;
  private elementRef = inject(ElementRef);

  codeCopied = signal(false);
  isNotificationsOpen = signal(false);
  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);

  constructor() {
    effect(async () => {
      const user = this.currentUser();
      if (user) {
        await this.fetchNotifications(user.uid);
        this.listenForNotifications(user.uid);
      }
    }, { allowSignalWrites: true });
  }
  
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isNotificationsOpen.set(false);
    }
  }
  
  toggleNotifications() {
    if (this.isNotificationsOpen()) {
      this.isNotificationsOpen.set(false);
    } else {
      this.markNotificationsAsRead();
    }
  }

  async fetchNotifications(userId: string) {
    const { data, error } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) {
      this.notifications.set(data);
      this.unreadCount.set(data.filter(n => !n.is_read).length);
    }
  }

  listenForNotifications(userId: string) {
     supabaseClient
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => this.fetchNotifications(userId)
      )
      .subscribe();
  }

  async markNotificationsAsRead() {
    this.isNotificationsOpen.set(true);
    const unreadIds = this.notifications().filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabaseClient
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (!error) {
      this.notifications.update(notifs => 
        notifs.map(n => ({ ...n, is_read: true }))
      );
      this.unreadCount.set(0);
    }
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchService.searchTerm.set(input.value);
  }

  async logout() {
    await this.authService.logout();
    this.navigateToHome.emit();
  }

  copyPromoCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.codeCopied.set(true);
      setTimeout(() => {
        this.codeCopied.set(false);
      }, 2000);
    });
  }
}