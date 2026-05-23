declare namespace Express {
  interface AuthUser {
    id: string;
    email: string;
    role: 'admin' | 'photographer' | 'client' | string;
    full_name?: string;
  }
  interface Request {
    user?: AuthUser;
  }
}
