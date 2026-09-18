import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import {
  UserButton as ClerkUserButton,
  OrganizationSwitcher as ClerkOrganizationSwitcher,
  useAuth,
} from "@clerk/tanstack-react-start";
import { useCurrentUserState } from "./use-current-user";

/**
 * Auth state components — plain wrappers around `useCurrentUserState()`.
 *
 * Visitors are signed out until Clerk authenticates them. While the session is
 * still resolving, gates that care about signed-out state
 * render nothing so there's no signed-out flash on hard reload.
 */

/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a verified Clerk user is present. */
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}

/**
 * Render children only once we KNOW the visitor is signed out (`isPending` has
 * cleared and there is no user). Hidden while the session is still loading.
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

/**
 * Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
 * `window.location` reload). A hard navigation re-bootstraps the SPA and re-runs
 * session loading, which feels like a second "Loading…" on /login.
 *
 * Guard routes by waiting out `isPending` first (see `use-current-user`), then
 * render this.
 */
export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  return <Navigate to={to} />;
}

/**
 * Minimal signed-in identity chip + sign-out. Restyle freely (see the
 * `design-ui` skill). Sign-out is only shown when auth is enabled (the
 * disabled-auth dev user has nothing to sign out of).
 */
export function UserButton() {
  return <ClerkUserButton />;
}

export function OrganizationSwitcher() {
  return <ClerkOrganizationSwitcher hidePersonal={false} />;
}

/**
 * Render children only when the active organization membership's role is
 * `org:admin`. UX-only — the routes/server functions behind this gate must
 * ALSO enforce it server-side via `adminMiddleware` (`./middleware`), since
 * this component is trivially bypassable client-side.
 */
export function RequireOrgAdmin({ children }: { children: ReactNode }) {
  const { isLoaded, orgId, orgRole } = useAuth();
  if (!isLoaded || !orgId || orgRole !== "org:admin") return null;
  return <>{children}</>;
}
