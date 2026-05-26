import { Link } from 'react-router-dom';
import { Button } from '../../components/primitives/Button';

export function LandingScreen() {
  return (
    <section className="flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Polls that get answers.
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Build single-choice, multiple-choice, and open-ended polls. Share a link, watch responses arrive in real time.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/register"><Button size="lg">Get started</Button></Link>
          <Link to="/login"><Button size="lg" variant="secondary">I have an account</Button></Link>
        </div>
      </div>
    </section>
  );
}
