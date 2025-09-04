
import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  navigateToHome = output<void>();
  navigateToPrivacy = output<void>();
  navigateToTerms = output<void>();
  navigateToJoin = output<void>();
}
