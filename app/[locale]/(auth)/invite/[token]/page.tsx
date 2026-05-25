// Invitation flow is now handled by Quality Hub.
// This page redirects users accordingly.
import { redirect } from "next/navigation";

export default async function InvitePage() {
  // Invitations are managed in Quality Hub; redirect to login
  redirect("/login");
}
