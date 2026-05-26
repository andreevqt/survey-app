import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthCard } from './AuthCard';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { Field } from '../../components/primitives/Field';
import { useRegisterMutation } from '../../auth/auth-mutations';
import { registerSchema, RegisterFormValues } from '../../forms/schemas/register.schema';

export function RegisterScreen() {
  const { register: registerInput, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });
  const reg = useRegisterMutation();
  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (values) => {
    try {
      await reg.mutateAsync(values);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr?.code === 'EMAIL_TAKEN') toast.error('That email is already registered.');
      else toast.error('Could not create your account.');
    }
  });

  return (
    <AuthCard title="Create an account" subtitle="Get started in 30 seconds.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Name" htmlFor="reg-name" error={errors.name?.message}>
          <Input id="reg-name" autoComplete="name" {...registerInput('name')} />
        </Field>
        <Field label="Email" htmlFor="reg-email" error={errors.email?.message}>
          <Input id="reg-email" type="email" autoComplete="email" {...registerInput('email')} />
        </Field>
        <Field label="Password" htmlFor="reg-pw" error={errors.password?.message}>
          <Input id="reg-pw" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...registerInput('password')} />
        </Field>
        <Button type="submit" isLoading={reg.isPending}>Create account</Button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Already have an account? <Link to="/login" className="text-indigo-600 hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  );
}
