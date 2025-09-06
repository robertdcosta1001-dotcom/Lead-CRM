"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Calendar, BarChart3, UserCheck, Target, DollarSign, Plus } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"

interface Profile {
  id: string
  first_name: string
  last_name: string
  role: "admin" | "manager" | "employee" | "sales_rep"
}

interface DashboardStats {
  totalEmployees: number
  presentToday: number
  totalLeads: number
  convertedLeads: number
  monthlyRevenue: number
  pendingTasks: number
}

const attendanceData = [
  { date: "Mon", present: 85, absent: 15 },
  { date: "Tue", present: 92, absent: 8 },
  { date: "Wed", present: 88, absent: 12 },
  { date: "Thu", present: 95, absent: 5 },
  { date: "Fri", present: 90, absent: 10 },
]

const salesData = [
  { month: "Jan", revenue: 45000 },
  { month: "Feb", revenue: 52000 },
  { month: "Mar", revenue: 48000 },
  { month: "Apr", revenue: 61000 },
  { month: "May", revenue: 55000 },
  { month: "Jun", revenue: 67000 },
]

const leadStatusData = [
  { name: "New", value: 30, color: "#3B82F6" },
  { name: "Contacted", value: 25, color: "#10B981" },
  { name: "Qualified", value: 20, color: "#F59E0B" },
  { name: "Closed", value: 25, color: "#EF4444" },
]

export function DashboardOverview({ profile }: { profile: Profile }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    totalLeads: 0,
    convertedLeads: 0,
    monthlyRevenue: 0,
    pendingTasks: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading dashboard data
    const loadDashboardData = async () => {
      setLoading(true)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setStats({
        totalEmployees: 45,
        presentToday: 38,
        totalLeads: 127,
        convertedLeads: 23,
        monthlyRevenue: 67000,
        pendingTasks: 8,
      })
      setLoading(false)
    }

    loadDashboardData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const getRoleBasedContent = () => {
    switch (profile.role) {
      case "admin":
        return {
          title: "Admin Dashboard",
          subtitle: "Complete system overview and management controls",
        }
      case "manager":
        return {
          title: "Manager Dashboard",
          subtitle: "Team performance and operational insights",
        }
      case "sales_rep":
        return {
          title: "Sales Dashboard",
          subtitle: "Your leads, appointments, and performance metrics",
        }
      default:
        return {
          title: "Employee Dashboard",
          subtitle: "Your attendance, tasks, and company updates",
        }
    }
  }

  const roleContent = getRoleBasedContent()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {profile.first_name}!
          </h1>
          <p className="text-gray-600 mt-1">{roleContent.subtitle}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => (window.location.href = "/dashboard/leads/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presentToday}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.presentToday / stats.totalEmployees) * 100)}% attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">{stats.convertedLeads} converted this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Bar dataKey="present" fill="#10b981" name="Present" />
                <Bar dataKey="absent" fill="#ef4444" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Line type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={leadStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                  {leadStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New employee onboarded</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Lead converted to customer</p>
                  <p className="text-xs text-gray-500">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Monthly report generated</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(profile.role === "admin" || profile.role === "manager") && (
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Add New Employee
                </Button>
              )}
              <Button
                className="w-full justify-start bg-transparent"
                variant="outline"
                onClick={() => (window.location.href = "/dashboard/leads/new")}
              >
                <Target className="w-4 h-4 mr-2" />
                Create New Lead
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
