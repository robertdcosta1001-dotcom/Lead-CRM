"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { FileText, Download, Users, Target, Clock, BarChart3 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format, startOfMonth, endOfMonth } from "date-fns"
import type { DateRange } from "react-day-picker"

interface Profile {
  id: string
  first_name: string
  last_name: string
  role: "admin" | "manager" | "employee" | "sales_rep"
}

export function ReportsView({ profile }: { profile: Profile }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [reportType, setReportType] = useState("attendance")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const generateReport = async (type: string) => {
    setLoading(true)
    try {
      const fromDate = dateRange?.from || startOfMonth(new Date())
      const toDate = dateRange?.to || endOfMonth(new Date())

      let data: any[] = []
      let headers: string[] = []
      let filename = ""

      switch (type) {
        case "attendance":
          const { data: attendanceData } = await supabase
            .from("attendance")
            .select(`
              *,
              profiles:user_id (
                first_name,
                last_name,
                department
              )
            `)
            .gte("date", format(fromDate, "yyyy-MM-dd"))
            .lte("date", format(toDate, "yyyy-MM-dd"))
            .order("date", { ascending: false })

          headers = ["Date", "Employee", "Department", "Clock In", "Clock Out", "Status", "Hours"]
          data =
            attendanceData?.map((record) => [
              record.date,
              `${record.profiles?.first_name} ${record.profiles?.last_name}`,
              record.profiles?.department || "N/A",
              record.clock_in ? format(new Date(record.clock_in), "HH:mm") : "N/A",
              record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "N/A",
              record.status,
              record.clock_in && record.clock_out
                ? (
                    (new Date(record.clock_out).getTime() - new Date(record.clock_in).getTime()) /
                    (1000 * 60 * 60)
                  ).toFixed(1)
                : "N/A",
            ]) || []
          filename = `attendance-report-${format(fromDate, "yyyy-MM-dd")}-to-${format(toDate, "yyyy-MM-dd")}.csv`
          break

        case "sales":
          const { data: salesData } = await supabase
            .from("sales_leads")
            .select(`
              *,
              profiles:assigned_to (
                first_name,
                last_name
              )
            `)
            .gte("created_at", fromDate.toISOString())
            .lte("created_at", toDate.toISOString())
            .order("created_at", { ascending: false })

          headers = [
            "Company",
            "Contact",
            "Email",
            "Phone",
            "Status",
            "Priority",
            "Score",
            "Value",
            "Assigned To",
            "Created",
          ]
          data =
            salesData?.map((lead) => [
              lead.company_name,
              lead.contact_name,
              lead.email || "N/A",
              lead.phone || "N/A",
              lead.status,
              lead.priority,
              lead.score,
              lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : "N/A",
              `${lead.profiles?.first_name} ${lead.profiles?.last_name}`,
              format(new Date(lead.created_at), "yyyy-MM-dd"),
            ]) || []
          filename = `sales-report-${format(fromDate, "yyyy-MM-dd")}-to-${format(toDate, "yyyy-MM-dd")}.csv`
          break

        case "employees":
          const { data: employeeData } = await supabase
            .from("profiles")
            .select("*")
            .eq("is_active", true)
            .order("first_name", { ascending: true })

          headers = ["Name", "Email", "Role", "Department", "Position", "Hire Date", "Phone", "Status"]
          data =
            employeeData?.map((employee) => [
              `${employee.first_name} ${employee.last_name}`,
              employee.email,
              employee.role,
              employee.department || "N/A",
              employee.position || "N/A",
              employee.hire_date || "N/A",
              employee.phone || "N/A",
              employee.is_active ? "Active" : "Inactive",
            ]) || []
          filename = `employees-report-${format(new Date(), "yyyy-MM-dd")}.csv`
          break

        default:
          return
      }

      // Generate CSV
      const csvContent = [headers.join(","), ...data.map((row) => row.join(","))].join("\n")

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error generating report:", error)
    } finally {
      setLoading(false)
    }
  }

  const reportTypes = [
    {
      value: "attendance",
      label: "Attendance Report",
      icon: Clock,
      description: "Employee attendance and time tracking",
    },
    { value: "sales", label: "Sales Report", icon: Target, description: "Lead generation and conversion metrics" },
    { value: "employees", label: "Employee Report", icon: Users, description: "Employee directory and information" },
  ]

  const canAccessReports = ["admin", "manager"].includes(profile.role)

  if (!canAccessReports) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">You don't have permission to access reports.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and export detailed reports for attendance, sales, and employee data.
        </p>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
          </div>

          <Button onClick={() => generateReport(reportType)} disabled={loading} className="w-full md:w-auto">
            {loading ? (
              <>
                <BarChart3 className="mr-2 h-4 w-4 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate & Download Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Available Reports */}
      <div className="grid gap-4 md:grid-cols-3">
        {reportTypes.map((type) => {
          const Icon = type.icon
          return (
            <Card
              key={type.value}
              className={`cursor-pointer transition-colors ${
                reportType === type.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => setReportType(type.value)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Icon className="h-5 w-5" />
                  <span>{type.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              onClick={() => {
                setReportType("attendance")
                generateReport("attendance")
              }}
              disabled={loading}
            >
              <Clock className="mr-2 h-4 w-4" />
              Today's Attendance
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setReportType("sales")
                generateReport("sales")
              }}
              disabled={loading}
            >
              <Target className="mr-2 h-4 w-4" />
              Monthly Sales
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setReportType("employees")
                generateReport("employees")
              }}
              disabled={loading}
            >
              <Users className="mr-2 h-4 w-4" />
              Employee Directory
            </Button>

            <Button variant="outline" onClick={() => window.open("/dashboard/analytics", "_blank")}>
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
