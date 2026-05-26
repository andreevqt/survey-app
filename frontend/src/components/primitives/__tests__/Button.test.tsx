import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

it('renders children and fires onClick', async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Save</Button>);
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('disables interaction while loading', async () => {
  const onClick = vi.fn();
  render(<Button isLoading onClick={onClick}>Save</Button>);
  await userEvent.click(screen.getByRole('button'));
  expect(onClick).not.toHaveBeenCalled();
});
