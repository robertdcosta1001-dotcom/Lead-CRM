export default function CoachingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coaching Reports</h1>
        <p className="text-muted-foreground">Generate and manage employee coaching reports and performance insights.</p>
      </div>

      <CoachingReports />
    </div>
  )
}

import { CoachingReports } from "@/components/coaching/coaching-reports"
