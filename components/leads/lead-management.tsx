"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Target, Plus, Search, Edit, Eye, Phone, Mail, Calendar, TrendingUp, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { LeadForm } from "./lead-form"
import { LeadDetails } from "./lead-details"
import { LeadExport } from "./lead-export"

interface Profile {
  id: string
  first_name: string
  last_name: string
  role: "admin" | "manager" | "employee" | "sales_rep"
}

interface Lead {
  id: string
  company_name: string
  contact_name: string
  email: string | null
  phone: string | null
  address: string | null
  industry: string | null
  lead_source: string | null
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost"
  priority: "low" | "medium" | "high" | "urgent"
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

export function LeadManagement({ profile }: { profile: Profile }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [showAddLead, setShowAddLead] = useState(false)
  const [showEditLead, setShowEditLead] = useState(false)
  const [showLeadDetails, setShowLeadDetails] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [salesReps, setSalesReps] = useState<{ id: string; name: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadLeads()
    loadSalesReps()
  }, [])

  useEffect(() => {
    filterLeads()
  }, [leads, searchTerm, statusFilter, priorityFilter, assigneeFilter])

  const loadLeads = async () => {
    try {
      let query = supabase
        .from("sales_leads")
        .select(`
          *,
          profiles:assigned_to (
            first_name,
            last_name
          )
        `)
        .order("updated_at", { ascending: false })

      // If user is not admin/manager, only show their assigned leads
      if (!["admin", "manager"].includes(profile.role)) {
        query = query.eq("assigned_to", profile.id)
      }

      const { data: leadsData } = await query
      setLeads(leadsData || [])
    } catch (error) {
      console.error("Error loading leads:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadSalesReps = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("role", ["sales_rep", "manager", "admin"])
        .eq("is_active", true)

      const reps =
        data?.map((rep) => ({
          id: rep.id,
          name: `${rep.first_name} ${rep.last_name}`,
        })) || []

      setSalesReps(reps)
    } catch (error) {
      console.error("Error loading sales reps:", error)
    }
  }

  const filterLeads = () => {
    let filtered = leads

    if (searchTerm) {
      filtered = filtered.filter((lead) =>
        `${lead.company_name} ${lead.contact_name} ${lead.email || ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter)
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((lead) => lead.priority === priorityFilter)
    }

    if (assigneeFilter !== "all") {
      filtered = filtered.filter((lead) => lead.assigned_to === assigneeFilter)
    }

    setFilteredLeads(filtered)
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

  const handleLeadAction = (action: "view" | "edit", lead: Lead) => {
    setSelectedLead(lead)
    if (action === "view") {
      setShowLeadDetails(true)
    } else {
      setShowEditLead(true)
    }
  }

  const canManageLeads = ["admin", "manager", "sales_rep"].includes(profile.role)

  if (loading) {
    return <div className="text-center py-8">Loading leads...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Lead Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage sales opportunities with lead scoring and follow-up scheduling.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <LeadExport userRole={profile.role} />

          {canManageLeads && (
            <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                </DialogHeader>
                <LeadForm
                  onSuccess={() => {
                    setShowAddLead(false)
                    loadLeads()
                  }}
                  onCancel={() => setShowAddLead(false)}
                  currentUserId={profile.id}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
            <p className="text-xs text-muted-foreground">
              {
                leads.filter((l) => ["new", "contacted", "qualified", "proposal", "negotiation"].includes(l.status))
                  .length
              }{" "}
              active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified Leads</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {leads.filter((l) => ["qualified", "proposal", "negotiation"].includes(l.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for proposal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Won</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {leads.filter((l) => l.status === "closed_won").length}
            </div>
            <p className="text-xs text-muted-foreground">
              $
              {leads
                .filter((l) => l.status === "closed_won")
                .reduce((sum, l) => sum + (l.estimated_value || 0), 0)
                .toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.length > 0
                ? Math.round((leads.filter((l) => l.status === "closed_won").length / leads.length) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Win rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="closed_lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {["admin", "manager"].includes(profile.role) && (
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {salesReps.map((rep) => (
                    <SelectItem key={rep.id} value={rep.id}>
                      {rep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium">{lead.company_name}</h3>
                      {getStatusBadge(lead.status)}
                      {getPriorityBadge(lead.priority)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getScoreColor(lead.score)}`}>Score: {lead.score}</span>
                      {lead.estimated_value && (
                        <span className="text-sm text-muted-foreground">${lead.estimated_value.toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">Contact:</span>
                      <span>{lead.contact_name}</span>
                    </div>

                    {lead.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{lead.email}</span>
                      </div>
                    )}

                    {lead.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span>
                        Assigned to: {lead.profiles.first_name} {lead.profiles.last_name}
                      </span>
                      {lead.industry && <span>Industry: {lead.industry}</span>}
                      {lead.lead_source && <span>Source: {lead.lead_source}</span>}
                    </div>

                    <div className="flex items-center space-x-4">
                      <span>Updated: {format(new Date(lead.updated_at), "MMM dd, yyyy")}</span>
                      {lead.next_follow_up && (
                        <div className="flex items-center space-x-1 text-orange-600">
                          <Calendar className="h-3 w-3" />
                          <span>Follow-up: {format(new Date(lead.next_follow_up), "MMM dd")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button size="sm" variant="ghost" onClick={() => handleLeadAction("view", lead)}>
                    <Eye className="h-4 w-4" />
                  </Button>

                  {canManageLeads && (
                    <Button size="sm" variant="ghost" onClick={() => handleLeadAction("edit", lead)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {filteredLeads.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No leads found matching the current filters.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Lead Dialog */}
      <Dialog open={showEditLead} onOpenChange={setShowEditLead}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <LeadForm
              lead={selectedLead}
              onSuccess={() => {
                setShowEditLead(false)
                setSelectedLead(null)
                loadLeads()
              }}
              onCancel={() => {
                setShowEditLead(false)
                setSelectedLead(null)
              }}
              currentUserId={profile.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Lead Details Dialog */}
      <Dialog open={showLeadDetails} onOpenChange={setShowLeadDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <LeadDetails
              lead={selectedLead}
              onClose={() => {
                setShowLeadDetails(false)
                setSelectedLead(null)
              }}
              onEdit={() => {
                setShowLeadDetails(false)
                setShowEditLead(true)
              }}
              canEdit={canManageLeads}
              currentUserId={profile.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
