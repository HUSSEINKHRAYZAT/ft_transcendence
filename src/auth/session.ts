// Reads auth from localStorage and exposes a guard used by actions.
export type FrontendUser = {
  name: string;
  firstName?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  id?: string | number;
} | null;

export function getFrontendUser(): FrontendUser {
  const token = localStorage.getItem('ft_pong_auth_token');
  const raw = localStorage.getItem('ft_pong_user_data');
  if (!token || !raw) return null;

  try {
    const u = JSON.parse(raw);
    return {
      name: u.firstName ? `${u.firstName} ${u.lastName}` : (u.userName || u.email),
      firstName: u.firstName,
      lastName: u.lastName,
      userName: u.userName,
      email: u.email,
      id: u.id,
    };
  } catch {
    return null;
  }
}

export function requireLogin(show: (html: string) => HTMLElement): { user: FrontendUser } {
  const user = getFrontendUser();
  if (!user) {
    show(`<div class="card">
      <div class="font-bold mb-2 text-lime-500">🔐 Sign in required</div>
      <div class="muted">Please use the frontend login to access online features.</div>
      <div class="mt-4 text-right"><button class="btn btn-primary" data-close>Got it!</button></div>
    </div>`);
    throw new Error('not-signed-in');
  }
  return { user };
}
