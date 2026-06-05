import { Card } from '../../../components/primitives/Card';
import { ProfileSection } from './sections/ProfileSection';
import { PasswordSection } from './sections/PasswordSection';
import { EmailNotificationsSection } from './sections/EmailNotificationsSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { SessionsSection } from './sections/SessionsSection';
import { DangerZoneSection } from './sections/DangerZoneSection';

export function SettingsPage() {
  return (
    <div className="mt-8 px-8">
      <Card className="max-w-3xl mx-auto">
        <div className="flex flex-col divide-y divide-gray-200">
          <div className="pb-6"><ProfileSection /></div>
          <div className="py-6"><PasswordSection /></div>
          <div className="py-6"><EmailNotificationsSection /></div>
          <div className="py-6"><AppearanceSection /></div>
          <div className="py-6"><SessionsSection /></div>
          <div className="pt-6"><DangerZoneSection /></div>
        </div>
      </Card>
    </div>
  );
}
