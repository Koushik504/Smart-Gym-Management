"use client";
import { ErrorState } from "@/components/dashboard";
export default function ErrorBoundary({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <ErrorState
      message="This view could not be loaded. Check the database and try again."
      retry={reset}
    />
  );
}
