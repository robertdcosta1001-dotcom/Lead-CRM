"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Users, Clock, MapPin, Eye, Download, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { AttendanceImageViewer } from "./attendance-image-viewer"

interface Profile {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface AttendanceWithProfile {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  status: string
  selfie_url: string | null
  clock_in_location: string | null
  clock_out_location: string | null
  profiles: {
    first_name: string
    last_name: string
    department: string
  }
}

export function AttendanceAdminView({ profile }: { profile: Profile }) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceWithProfile[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceWithProfile[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("")
  const supabase = createClient()

  useEffect(() => {
    loadAttendanceData()
  }, [selectedDate])

  useEffect(() => {
    filterRecords()
  }, [attendanceRecords, searchTerm, statusFilter])

  const loadAttendanceData = async () => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")

      const { data: records } = await supabase
        .from("attendance")
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            department
          )
        `)
        .eq("date", dateStr)
        .order("clock_in", { ascending: true })

      setAttendanceRecords(records || [])
    } catch (error) {
      console.error("Error loading attendance data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterRecords = () => {
    let filtered = attendanceRecords

    if (searchTerm) {
      filtered = filtered.filter((record) =>
        `${record.profiles.first_name} ${record.profiles.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => record.status === statusFilter)
    }

    setFilteredRecords(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800">Present</Badge>
      case "late":
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>
      case "absent":
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>
      case "early_departure":
        return <Badge className="bg-orange-100 text-orange-800">Early Departure</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const viewSelfie = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl)
    setShowImageViewer(true)
  }

  const exportAttendance = () => {
    const csvContent = [
      ["Name", "Department", "Date", "Clock In", "Clock Out", "Status", "Has Selfie", "Location Verified"].join(","),
      ...filteredRecords.map((record) =>
        [
          `${record.profiles.first_name} ${record.profiles.last_name}`,
          record.profiles.department || "N/A",
          record.date,
          record.clock_in ? format(new Date(record.clock_in), "HH:mm") : "N/A",
          record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "N/A",
          record.status,
          record.selfie_url ? "Yes" : "No",
          record.clock_in_location ? "Yes" : "No",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `attendance-${format(selectedDate, "yyyy-MM-dd")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="text-center py-8">Loading attendance data...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance Management</h1>
        <p className="text-muted-foreground mt-1">Monitor and manage employee attendance with selfie verification.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRecords.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {attendanceRecords.filter((r) => r.status === "present").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {attendanceRecords.filter((r) => r.status === "late").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {attendanceRecords.filter((r) => r.status === "absent").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filters & Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Employee</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="early_departure">Early Departure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={exportAttendance} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records - {format(selectedDate, "MMMM dd, yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">
                      {record.profiles.first_name} {record.profiles.last_name}
                    </h3>
                    {getStatusBadge(record.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Department:</span> {record.profiles.department || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Clock In:</span>{" "}
                      {record.clock_in ? format(new Date(record.clock_in), "h:mm a") : "N/A"}
                    </div>
                    <div>
                      <span className="font-medium">Clock Out:</span>{" "}
                      {record.clock_out ? format(new Date(record.clock_out), "h:mm a") : "N/A"}
                    </div>
                    <div className="flex items-center space-x-2">
                      {record.clock_in_location && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <MapPin className="h-3 w-3" />
                          <span>Location verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {record.selfie_url && (
                    <Button size="sm" variant="outline" onClick={() => viewSelfie(record.selfie_url!)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Selfie
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {filteredRecords.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No attendance records found for the selected criteria.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <AttendanceImageViewer
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        imageUrl={selectedImageUrl}
      />
    </div>
  )
}
