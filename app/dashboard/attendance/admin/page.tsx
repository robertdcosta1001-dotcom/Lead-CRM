import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AttendanceAdminView } from "@/components/attendance/attendance-admin-view"

export default async function AttendanceAdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard/attendance")
  }

  return (
    <DashboardLayout user={user} profile={profile}>
      <AttendanceAdminView profile={profile} />
    </DashboardLayout>
  )
}
