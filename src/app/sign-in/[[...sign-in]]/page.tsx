/**
 * In-app sign-in page. Clerk component handles UI and redirect.
 * @see docs/AUTH.md
 */

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn />
    </div>
  );
}
