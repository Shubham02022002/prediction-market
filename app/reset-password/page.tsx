import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
