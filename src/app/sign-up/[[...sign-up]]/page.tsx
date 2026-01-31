/**
 * In-app sign-up page. Clerk component handles UI and redirect.
 * @see docs/AUTH.md
 */

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp />
    </div>
  );
}
