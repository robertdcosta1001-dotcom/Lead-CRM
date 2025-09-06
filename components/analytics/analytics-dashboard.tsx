"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import { Target, DollarSign, TrendingUp, Clock, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import type { DateRange } from "react-day-picker"

interface Profile {
  id: string
  first_name: string
  last_name: string
  role: "admin" | "manager" | "employee" | "sales_rep"
}

interface AnalyticsData {
  totalEmployees: number
  activeEmployees: number
  totalLeads: number
  convertedLeads: number
  totalRevenue: number
  avgDealSize: number
  attendanceRate: number
  topPerformers: Array<{
    name: string
    leads: number
    revenue: number
  }>
  attendanceTrends: Array<{
    date: string
    present: number
    absent: number
    late: number
  }>
  salesPipeline: Array<{
    status: string
    count: number
    value: number
  }>
  leadSources: Array<{
    source: string
    count: number
    percentage: number
  }>
  monthlyRevenue: Array<{
    month: string
    revenue: number
    leads: number
  }>
}

export function AnalyticsDashboard({ profile }: { profile: Profile }) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalLeads: 0,
    convertedLeads: 0,
    totalRevenue: 0,
    avgDealSize: 0,
    attendanceRate: 0,
    topPerformers: [],
    attendanceTrends: [],
    salesPipeline: [],
    leadSources: [],
    monthlyRevenue: [],
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [selectedMetric, setSelectedMetric] = useState("overview")
  const supabase = createClient()

  useEffect(() => {
    loadAnalyticsData()
  }, [dateRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const fromDate = dateRange?.from || startOfMonth(new Date())
      const toDate = dateRange?.to || endOfMonth(new Date())

      // Load employee data
      const { data: employees } = await supabase.from("profiles").select("*")
      const totalEmployees = employees?.length || 0
      const activeEmployees = employees?.filter((emp) => emp.is_active).length || 0

      // Load leads data
      const { data: leads } = await supabase
        .from("sales_leads")
        .select("*, profiles:assigned_to(first_name, last_name)")
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString())

      const totalLeads = leads?.length || 0
      const convertedLeads = leads?.filter((lead) => lead.status === "closed_won").length || 0
      const totalRevenue = leads?.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0) || 0
      const avgDealSize = convertedLeads > 0 ? totalRevenue / convertedLeads : 0

      // Load attendance data
      const { data: attendance } = await supabase
        .from("attendance")
        .select("*")
        .gte("date", format(fromDate, "yyyy-MM-dd"))
        .lte("date", format(toDate, "yyyy-MM-dd"))

      const attendanceRate = attendance?.length
        ? (attendance.filter((att) => att.status === "present").length / attendance.length) * 100
        : 0

      // Calculate top performers
      const performerMap = new Map()
      leads?.forEach((lead) => {
        const assigneeName = `${lead.profiles?.first_name} ${lead.profiles?.last_name}`
        if (!performerMap.has(assigneeName)) {
          performerMap.set(assigneeName, { name: assigneeName, leads: 0, revenue: 0 })
        }
        const performer = performerMap.get(assigneeName)
        performer.leads += 1
        if (lead.status === "closed_won") {
          performer.revenue += lead.estimated_value || 0
        }
      })
      const topPerformers = Array.from(performerMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Calculate attendance trends (last 30 days)
      const attendanceTrends = []
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd")
        const dayAttendance = attendance?.filter((att) => att.date === date) || []
        attendanceTrends.push({
          date: format(subDays(new Date(), i), "MMM dd"),
          present: dayAttendance.filter((att) => att.status === "present").length,
          absent: dayAttendance.filter((att) => att.status === "absent").length,
          late: dayAttendance.filter((att) => att.status === "late").length,
        })
      }

      // Calculate sales pipeline
      const pipelineMap = new Map()
      leads?.forEach((lead) => {
        if (!pipelineMap.has(lead.status)) {
          pipelineMap.set(lead.status, { status: lead.status, count: 0, value: 0 })
        }
        const stage = pipelineMap.get(lead.status)
        stage.count += 1
        stage.value += lead.estimated_value || 0
      })
      const salesPipeline = Array.from(pipelineMap.values())

      // Calculate lead sources
      const sourceMap = new Map()
      leads?.forEach((lead) => {
        const source = lead.lead_source || "Unknown"
        sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
      })
      const leadSources = Array.from(sourceMap.entries()).map(([source, count]) => ({
        source,
        count,
        percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
      }))

      // Calculate monthly revenue (last 6 months)
      const monthlyRevenue = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subDays(new Date(), i * 30))
        const monthEnd = endOfMonth(monthStart)
        const monthLeads = leads?.filter(
          (lead) =>
            new Date(lead.created_at) >= monthStart &&
            new Date(lead.created_at) <= monthEnd &&
            lead.status === "closed_won",
        )
        monthlyRevenue.push({
          month: format(monthStart, "MMM yyyy"),
          revenue: monthLeads?.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0) || 0,
          leads: monthLeads?.length || 0,
        })
      }

      setAnalyticsData({
        totalEmployees,
        activeEmployees,
        totalLeads,
        convertedLeads,
        totalRevenue,
        avgDealSize,
        attendanceRate,
        topPerformers,
        attendanceTrends,
        salesPipeline,
        leadSources,
        monthlyRevenue,
      })
    } catch (error) {
      console.error("Error loading analytics data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = () => {
    const csvContent = [
      ["Metric", "Value"],
      ["Total Employees", analyticsData.totalEmployees],
      ["Active Employees", analyticsData.activeEmployees],
      ["Total Leads", analyticsData.totalLeads],
      ["Converted Leads", analyticsData.convertedLeads],
      ["Total Revenue", `$${analyticsData.totalRevenue.toLocaleString()}`],
      ["Average Deal Size", `$${analyticsData.avgDealSize.toLocaleString()}`],
      ["Attendance Rate", `${analyticsData.attendanceRate.toFixed(1)}%`],
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `analytics-${format(new Date(), "yyyy-MM-dd")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#c6f6d5"]

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into attendance, sales performance, and business metrics.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          <Button onClick={exportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsData.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Avg deal: ${analyticsData.avgDealSize.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lead Conversion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.totalLeads > 0
                ? Math.round((analyticsData.convertedLeads / analyticsData.totalLeads) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.convertedLeads} of {analyticsData.totalLeads} leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{analyticsData.activeEmployees} active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.topPerformers.length > 0 ? analyticsData.topPerformers[0].leads : 0}
            </div>
            <p className="text-xs text-muted-foreground">Top performer leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#059669" fill="#059669" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.leadSources}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ source, percentage }) => `${source} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.leadSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.attendanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="present" stackId="a" fill="#059669" name="Present" />
                  <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late" />
                  <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sales Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.salesPipeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, "Count"]} />
                    <Bar dataKey="count" fill="#059669" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pipeline Value</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.salesPipeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Value"]} />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topPerformers.map((performer, index) => (
                  <div
                    key={performer.name}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{performer.name}</p>
                        <p className="text-sm text-muted-foreground">{performer.leads} leads</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${performer.revenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                ))}

                {analyticsData.topPerformers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No performance data available for the selected period.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
