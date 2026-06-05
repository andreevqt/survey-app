import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../../../../components/primitives/Input';
import { Field } from '../../../../components/primitives/Field';
import { Button } from '../../../../components/primitives/Button';
import { useChangePasswordMutation } from '../../../../auth/auth-mutations';

export function PasswordSection() {
  const change = useChangePasswordMutation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [lengthError, setLengthError] = useState<string | null>(null);

  const onUpdate = async () => {
    setCurrentError(null);
    setMatchError(null);
    setLengthError(null);
    if (newPassword.length < 8) {
      setLengthError('Use at least 8 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMatchError('Passwords do not match');
      return;
    }
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 401) {
        setCurrentError('Current password is incorrect');
      } else {
        toast.error('Could not update password');
      }
    }
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">Password</h3>
      <p className="mt-1 text-sm text-gray-500">Update the password used to sign in.</p>
      <div className="mt-4 flex flex-col gap-4">
        <Field label="Current password" error={currentError ?? undefined}>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Field label="New password" error={lengthError ?? undefined}>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </Field>
        <Field label="Confirm new password" error={matchError ?? undefined}>
          <Input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Re-enter new password"
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onUpdate} isLoading={change.isPending}>Update password</Button>
      </div>
    </div>
  );
}
