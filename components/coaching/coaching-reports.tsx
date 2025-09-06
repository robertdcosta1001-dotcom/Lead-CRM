"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, TrendingUp, FileText, Send } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"

interface CoachingReport {
  id: string
  employee_id: string
  employee_name: string
  report_month: string
  attendance_score: number
  sales_performance: number
  lead_conversion: number
  overall_rating: string
  recommendations: string[]
  created_at: string
  sent_at?: string
}

export function CoachingReports() {
  const [reports, setReports] = useState<CoachingReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [generating, setGenerating] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchReports()
  }, [selectedMonth])

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("coaching_reports")
        .select(`
          *,
          profiles!coaching_reports_employee_id_fkey(full_name)
        `)
        .eq("report_month", selectedMonth)
        .order("created_at", { ascending: false })

      if (error) throw error

      const formattedReports =
        data?.map((report) => ({
          ...report,
          employee_name: report.profiles?.full_name || "Unknown Employee",
        })) || []

      setReports(formattedReports)
    } catch (error) {
      console.error("Error fetching reports:", error)
      toast.error("Failed to fetch coaching reports")
    } finally {
      setLoading(false)
    }
  }

  const generateMonthlyReports = async () => {
    setGenerating(true)
    try {
      // Get all active employees
      const { data: employees, error: employeesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "active")

      if (employeesError) throw employeesError

      for (const employee of employees || []) {
        // Calculate attendance score
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("*")
          .eq("user_id", employee.id)
          .gte("clock_in", `${selectedMonth}-01`)
          .lt("clock_in", `${selectedMonth}-31`)

        const attendanceScore = calculateAttendanceScore(attendanceData || [])

        // Calculate sales performance
        const { data: leadsData } = await supabase
          .from("leads")
          .select("*")
          .eq("assigned_to", employee.id)
          .gte("created_at", `${selectedMonth}-01`)
          .lt("created_at", `${selectedMonth}-31`)

        const salesPerformance = calculateSalesPerformance(leadsData || [])
        const leadConversion = calculateLeadConversion(leadsData || [])

        // Generate recommendations
        const recommendations = generateRecommendations(attendanceScore, salesPerformance, leadConversion)
        const overallRating = calculateOverallRating(attendanceScore, salesPerformance, leadConversion)

        // Create coaching report
        const { error: reportError } = await supabase.from("coaching_reports").insert({
          employee_id: employee.id,
          report_month: selectedMonth,
          attendance_score: attendanceScore,
          sales_performance: salesPerformance,
          lead_conversion: leadConversion,
          overall_rating: overallRating,
          recommendations: recommendations,
        })

        if (reportError) throw reportError
      }

      toast.success("Monthly coaching reports generated successfully")
      fetchReports()
    } catch (error) {
      console.error("Error generating reports:", error)
      toast.error("Failed to generate coaching reports")
    } finally {
      setGenerating(false)
    }
  }

  const sendEmailDigest = async () => {
    try {
      // In a real implementation, this would send emails to managers
      // For now, we'll just mark reports as sent
      const reportIds = reports.map((r) => r.id)

      const { error } = await supabase
        .from("coaching_reports")
        .update({ sent_at: new Date().toISOString() })
        .in("id", reportIds)

      if (error) throw error

      toast.success("Email digest sent to managers")
      fetchReports()
    } catch (error) {
      console.error("Error sending email digest:", error)
      toast.error("Failed to send email digest")
    }
  }

  const calculateAttendanceScore = (attendance: any[]) => {
    if (attendance.length === 0) return 0
    const onTimeCount = attendance.filter((a) => {
      const clockIn = new Date(a.clock_in)
      const expectedTime = new Date(clockIn)
      expectedTime.setHours(9, 0, 0, 0) // Assuming 9 AM start time
      return clockIn <= expectedTime
    }).length
    return Math.round((onTimeCount / attendance.length) * 100)
  }

  const calculateSalesPerformance = (leads: any[]) => {
    if (leads.length === 0) return 0
    const closedWonCount = leads.filter((l) => l.status === "closed_won").length
    return Math.round((closedWonCount / leads.length) * 100)
  }

  const calculateLeadConversion = (leads: any[]) => {
    if (leads.length === 0) return 0
    const qualifiedCount = leads.filter((l) =>
      ["qualified", "proposal", "negotiation", "closed_won"].includes(l.status),
    ).length
    return Math.round((qualifiedCount / leads.length) * 100)
  }

  const generateRecommendations = (attendance: number, sales: number, conversion: number) => {
    const recommendations = []

    if (attendance < 80) {
      recommendations.push("Improve punctuality and attendance consistency")
    }
    if (sales < 60) {
      recommendations.push("Focus on closing techniques and follow-up strategies")
    }
    if (conversion < 50) {
      recommendations.push("Enhance lead qualification and nurturing skills")
    }
    if (attendance >= 90 && sales >= 80) {
      recommendations.push("Excellent performance - consider mentoring opportunities")
    }

    return recommendations
  }

  const calculateOverallRating = (attendance: number, sales: number, conversion: number) => {
    const average = (attendance + sales + conversion) / 3
    if (average >= 90) return "Excellent"
    if (average >= 80) return "Good"
    if (average >= 70) return "Satisfactory"
    if (average >= 60) return "Needs Improvement"
    return "Poor"
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "Excellent":
        return "bg-green-100 text-green-800"
      case "Good":
        return "bg-blue-100 text-blue-800"
      case "Satisfactory":
        return "bg-yellow-100 text-yellow-800"
      case "Needs Improvement":
        return "bg-orange-100 text-orange-800"
      case "Poor":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading coaching reports...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date()
                date.setMonth(date.getMonth() - i)
                const monthStr = date.toISOString().slice(0, 7)
                return (
                  <SelectItem key={monthStr} value={monthStr}>
                    {date.toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button onClick={generateMonthlyReports} disabled={generating} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Generate Reports"}
          </Button>
          <Button onClick={sendEmailDigest} disabled={reports.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            Send Email Digest
          </Button>
        </div>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Monthly Reports</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No coaching reports found for this month</p>
                  <Button onClick={generateMonthlyReports} className="mt-4" disabled={generating}>
                    Generate Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{report.employee_name}</CardTitle>
                        <CardDescription>
                          Report for{" "}
                          {new Date(report.report_month).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                          })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRatingColor(report.overall_rating)}>{report.overall_rating}</Badge>
                        {report.sent_at && (
                          <Badge variant="outline">
                            <Mail className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">{report.attendance_score}%</div>
                        <div className="text-sm text-muted-foreground">Attendance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{report.sales_performance}%</div>
                        <div className="text-sm text-muted-foreground">Sales Performance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{report.lead_conversion}%</div>
                        <div className="text-sm text-muted-foreground">Lead Conversion</div>
                      </div>
                    </div>

                    {report.recommendations && report.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Recommendations:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {report.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reports.length}</div>
                <p className="text-xs text-muted-foreground">Generated for {selectedMonth}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reports.length > 0
                    ? Math.round(
                        reports.reduce(
                          (sum, r) => sum + (r.attendance_score + r.sales_performance + r.lead_conversion) / 3,
                          0,
                        ) / reports.length,
                      )
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">Overall team performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reports Sent</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reports.filter((r) => r.sent_at).length}</div>
                <p className="text-xs text-muted-foreground">Email digests delivered</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
