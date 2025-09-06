"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Edit,
  Building,
  Target,
  Plus,
  MessageSquare,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"

interface Lead {
  id: string
  company_name: string
  contact_name: string
  email: string | null
  phone: string | null
  address: string | null
  industry: string | null
  lead_source: string | null
  status: string
  priority: string
  score: number
  estimated_value: number | null
  notes: string | null
  next_follow_up: string | null
  created_at: string
  updated_at: string
  assigned_to: string
  profiles: {
    first_name: string
    last_name: string
  }
}

interface Activity {
  id: string
  activity_type: string
  description: string
  created_at: string
  profiles: {
    first_name: string
    last_name: string
  }
}

interface LeadDetailsProps {
  lead: Lead
  onClose: () => void
  onEdit: () => void
  canEdit: boolean
  currentUserId: string
}

export function LeadDetails({ lead, onClose, onEdit, canEdit, currentUserId }: LeadDetailsProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [newActivity, setNewActivity] = useState({
    activity_type: "note",
    description: "",
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadActivities()
  }, [lead.id])

  const loadActivities = async () => {
    try {
      const { data } = await supabase
        .from("lead_activities")
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })

      setActivities(data || [])
    } catch (error) {
      console.error("Error loading activities:", error)
    }
  }

  const handleAddActivity = async () => {
    if (!newActivity.description.trim()) return

    setLoading(true)
    try {
      const { error } = await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        user_id: currentUserId,
        activity_type: newActivity.activity_type,
        description: newActivity.description,
      })

      if (error) throw error

      setNewActivity({ activity_type: "note", description: "" })
      setShowAddActivity(false)
      await loadActivities()
    } catch (error) {
      console.error("Error adding activity:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-yellow-100 text-yellow-800",
      qualified: "bg-purple-100 text-purple-800",
      proposal: "bg-orange-100 text-orange-800",
      negotiation: "bg-indigo-100 text-indigo-800",
      closed_won: "bg-green-100 text-green-800",
      closed_lost: "bg-red-100 text-red-800",
    }

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    }

    return (
      <Badge className={priorityColors[priority as keyof typeof priorityColors] || "bg-gray-100 text-gray-800"}>
        {priority.toUpperCase()}
      </Badge>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    if (score >= 40) return "text-orange-600"
    return "text-red-600"
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "meeting":
        return <Calendar className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Building className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{lead.company_name}</h2>
            <p className="text-muted-foreground">{lead.contact_name}</p>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusBadge(lead.status)}
              {getPriorityBadge(lead.priority)}
              <span className={`text-sm font-medium ${getScoreColor(lead.score)}`}>Score: {lead.score}</span>
            </div>
          </div>
        </div>

        {canEdit && (
          <Button onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Contact Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.email && (
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{lead.email}</p>
                </div>
              </div>
            )}

            {lead.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{lead.phone}</p>
                </div>
              </div>
            )}

            {lead.address && (
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{lead.address}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Lead Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.industry && (
              <div>
                <p className="text-sm font-medium">Industry</p>
                <p className="text-sm text-muted-foreground">{lead.industry}</p>
              </div>
            )}

            {lead.lead_source && (
              <div>
                <p className="text-sm font-medium">Lead Source</p>
                <p className="text-sm text-muted-foreground">{lead.lead_source}</p>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Assigned To</p>
                <p className="text-sm text-muted-foreground">
                  {lead.profiles.first_name} {lead.profiles.last_name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">{format(new Date(lead.created_at), "MMMM dd, yyyy")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        {(lead.estimated_value || lead.next_follow_up) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Financial & Schedule</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.estimated_value && (
                <div>
                  <p className="text-sm font-medium">Estimated Value</p>
                  <p className="text-sm text-muted-foreground">${lead.estimated_value.toLocaleString()}</p>
                </div>
              )}

              {lead.next_follow_up && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Next Follow-up</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(lead.next_follow_up), "MMMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {lead.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activities & Notes</CardTitle>
            <Button size="sm" onClick={() => setShowAddActivity(!showAddActivity)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Activity Form */}
          {showAddActivity && (
            <div className="p-4 border border-border rounded-lg space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Select
                  value={newActivity.activity_type}
                  onValueChange={(value) => setNewActivity((prev) => ({ ...prev, activity_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder="Describe the activity or add notes..."
                value={newActivity.description}
                onChange={(e) => setNewActivity((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />

              <div className="flex justify-end space-x-2">
                <Button size="sm" variant="outline" onClick={() => setShowAddActivity(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddActivity} disabled={loading || !newActivity.description.trim()}>
                  Add Activity
                </Button>
              </div>
            </div>
          )}

          {/* Activities List */}
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
                <div className="mt-1">{getActivityIcon(activity.activity_type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">{activity.activity_type.replace("_", " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), "MMM dd, yyyy h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    by {activity.profiles.first_name} {activity.profiles.last_name}
                  </p>
                </div>
              </div>
            ))}

            {activities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No activities recorded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
