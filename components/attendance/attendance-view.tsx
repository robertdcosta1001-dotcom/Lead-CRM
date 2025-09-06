"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Camera, Clock, MapPin, CheckCircle, AlertCircle, Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { SelfieCapture } from "./selfie-capture"
import { AttendanceImageViewer } from "./attendance-image-viewer"

interface Profile {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface AttendanceRecord {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  status: "present" | "absent" | "late" | "early_departure"
  selfie_url: string | null
  clock_in_location: string | null
  clock_out_location: string | null
  notes: string | null
}

export function AttendanceView({ profile }: { profile: Profile }) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSelfieCapture, setShowSelfieCapture] = useState(false)
  const [captureAction, setCaptureAction] = useState<"clock_in" | "clock_out">("clock_in")
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("")
  const supabase = createClient()

  useEffect(() => {
    loadAttendanceData()
  }, [])

  const loadAttendanceData = async () => {
    try {
      const { data: records } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", profile.id)
        .order("date", { ascending: false })
        .limit(30)

      setAttendanceRecords(records || [])

      // Find today's record
      const today = new Date().toISOString().split("T")[0]
      const todayRec = records?.find((r) => r.date === today)
      setTodayRecord(todayRec || null)
    } catch (error) {
      console.error("Error loading attendance:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClockIn = () => {
    setCaptureAction("clock_in")
    setShowSelfieCapture(true)
  }

  const handleClockOut = () => {
    setCaptureAction("clock_out")
    setShowSelfieCapture(true)
  }

  const handleSelfieSuccess = async (selfieUrl: string, location: { lat: number; lng: number }) => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const now = new Date().toISOString()
      const locationPoint = `POINT(${location.lng} ${location.lat})`

      if (captureAction === "clock_in") {
        const { data, error } = await supabase
          .from("attendance")
          .upsert({
            user_id: profile.id,
            date: today,
            clock_in: now,
            status: "present",
            selfie_url: selfieUrl,
            clock_in_location: locationPoint,
          })
          .select()
          .single()

        if (error) throw error
        setTodayRecord(data)
      } else {
        if (!todayRecord) return

        const { data, error } = await supabase
          .from("attendance")
          .update({
            clock_out: now,
            clock_out_location: locationPoint,
          })
          .eq("id", todayRecord.id)
          .select()
          .single()

        if (error) throw error
        setTodayRecord(data)
      }

      await loadAttendanceData()
    } catch (error) {
      console.error("Error updating attendance:", error)
    }
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

  if (loading) {
    return <div className="text-center py-8">Loading attendance data...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance Tracking</h1>
        <p className="text-muted-foreground mt-1">
          Track your daily attendance with selfie verification and GPS location.
        </p>
      </div>

      {/* Today's Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Today's Attendance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              {todayRecord ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getStatusBadge(todayRecord.status)}
                  </div>

                  {todayRecord.clock_in && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Clock In:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{format(new Date(todayRecord.clock_in), "h:mm a")}</span>
                        {todayRecord.selfie_url && (
                          <Button size="sm" variant="ghost" onClick={() => viewSelfie(todayRecord.selfie_url!)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {todayRecord.clock_out && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Clock Out:</span>
                      <span className="text-sm font-medium">{format(new Date(todayRecord.clock_out), "h:mm a")}</span>
                    </div>
                  )}

                  {todayRecord.clock_in_location && (
                    <div className="flex items-center space-x-2 text-xs text-green-600">
                      <MapPin className="h-3 w-3" />
                      <span>Location verified</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No attendance recorded today</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {!todayRecord ? (
                <Button onClick={handleClockIn} className="w-full">
                  <Camera className="mr-2 h-4 w-4" />
                  Clock In with Selfie
                </Button>
              ) : !todayRecord.clock_out ? (
                <Button onClick={handleClockOut} variant="outline" className="w-full bg-transparent">
                  <MapPin className="mr-2 h-4 w-4" />
                  Clock Out
                </Button>
              ) : (
                <div className="flex items-center justify-center py-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-green-600">Day Complete</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Selfie and GPS location will be captured for verification
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
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
            <CardTitle>Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceRecords.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{format(new Date(record.date), "MMM dd, yyyy")}</p>
                      {record.selfie_url && (
                        <Button size="sm" variant="ghost" onClick={() => viewSelfie(record.selfie_url!)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {record.clock_in ? format(new Date(record.clock_in), "h:mm a") : "No clock in"} -
                      {record.clock_out ? format(new Date(record.clock_out), "h:mm a") : "No clock out"}
                    </p>
                    {record.clock_in_location && (
                      <div className="flex items-center space-x-1 mt-1">
                        <MapPin className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600">Verified</span>
                      </div>
                    )}
                  </div>
                  <div className="ml-2">{getStatusBadge(record.status)}</div>
                </div>
              ))}

              {attendanceRecords.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No attendance records found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <SelfieCapture
        isOpen={showSelfieCapture}
        onClose={() => setShowSelfieCapture(false)}
        onSuccess={handleSelfieSuccess}
        userId={profile.id}
        action={captureAction}
      />

      <AttendanceImageViewer
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        imageUrl={selectedImageUrl}
      />
    </div>
  )
}
