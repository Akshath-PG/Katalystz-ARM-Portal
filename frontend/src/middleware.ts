import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      // If there is a token, the user is authenticated.
      // We can also add role-based checks here if we want to restrict certain paths globally.
      return !!token;
    },
  },
  pages: {
    signIn: '/login',
  }
});

export const config = {
  // Protect all routes except login, api routes (except we might want to protect some api routes later), and public assets
  // Currently, the landing page is index.html outside the Next.js app, or maybe it's the root '/'?
  // Let's assume the dashboard is at `/` and `/schools`, `/users`, etc.
  // We'll protect all routes except `/login`, `/api/auth`, and static files.
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login (auth page)
     * - api/auth (auth api routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
