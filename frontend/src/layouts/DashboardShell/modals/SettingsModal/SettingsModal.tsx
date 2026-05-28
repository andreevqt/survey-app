import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../../components/primitives/Modal';
import { ProfileSection } from './sections/ProfileSection';
import { PasswordSection } from './sections/PasswordSection';

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
      </div>
    </Modal>
  );
}
