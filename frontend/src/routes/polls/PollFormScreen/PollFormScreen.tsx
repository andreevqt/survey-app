import { useNavigate, useParams } from 'react-router-dom';
import { PollForm } from '../../dashboard/PollForm';

export function PollFormScreen() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const goBack = () => navigate('/dashboard');

  return (
    <section className="max-w-3xl mx-auto py-12 px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit poll' : 'Create poll'}</h1>
        <button type="button" onClick={goBack} className="text-sm text-gray-600 hover:text-gray-900">Cancel</button>
      </div>
      <PollForm id={id} onSuccess={goBack} onCancel={goBack} />
    </section>
  );
}
