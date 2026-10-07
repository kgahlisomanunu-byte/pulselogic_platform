import { render, screen } from '@testing-library/react';
import App from './App';

test('redirects unauthenticated users to staff sign in', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
  expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
});
