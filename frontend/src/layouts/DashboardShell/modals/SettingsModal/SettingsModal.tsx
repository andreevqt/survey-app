import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../../components/primitives/Modal';
import { ProfileSection } from './sections/ProfileSection';
import { PasswordSection } from './sections/PasswordSection';
import { EmailNotificationsSection } from './sections/EmailNotificationsSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { SessionsSection } from './sections/SessionsSection';
import { DangerZoneSection } from './sections/DangerZoneSection';

export function SettingsModal() {
  const navigate = useNavigate();
  const close = () => navigate('/dashboard');

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title="Settings"
      subtitle="Manage your account and preferences."
    >
      <div className="flex flex-col divide-y divide-gray-200">
        <div className="pb-6"><ProfileSection /></div>
        <div className="py-6"><PasswordSection /></div>
        <div className="py-6"><EmailNotificationsSection /></div>
        <div className="py-6"><AppearanceSection /></div>
        <div className="py-6"><SessionsSection /></div>
        <div className="py-6"><DangerZoneSection /></div>
      </div>
    </Modal>
  );
}
