export type User = {
  id: string;
  name: string;
  email: string;
};

export function saveAuth(token: string, user: User) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function getAuth() {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user) return null;

  return {
    token,
    user: JSON.parse(user) as User,
  };
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
