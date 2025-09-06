"use client"

import type React from "react"
import type { SpeechRecognition } from "webkit-speech-recognition"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Mic, MicOff } from "lucide-react"

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
  assigned_to: string
}

interface LeadFormProps {
  lead?: Lead
  onSuccess: () => void
  onCancel: () => void
  currentUserId: string
}

export function LeadForm({ lead, onSuccess, onCancel, currentUserId }: LeadFormProps) {
  const [formData, setFormData] = useState({
    company_name: lead?.company_name || "",
    contact_name: lead?.contact_name || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    address: lead?.address || "",
    industry: lead?.industry || "",
    lead_source: lead?.lead_source || "",
    status: lead?.status || ("new" as const),
    priority: lead?.priority || ("medium" as const),
    score: lead?.score || 50,
    estimated_value: lead?.estimated_value?.toString() || "",
    notes: lead?.notes || "",
    next_follow_up: lead?.next_follow_up || "",
    assigned_to: lead?.assigned_to || currentUserId,
  })

  const [salesReps, setSalesReps] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const [isListening, setIsListening] = useState(false)
  const [activeField, setActiveField] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    loadSalesReps()

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        if (activeField) {
          handleInputChange(activeField, transcript)
        }
        setIsListening(false)
        setActiveField(null)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
        setActiveField(null)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
        setActiveField(null)
      }
    }
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const leadData = {
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        industry: formData.industry || null,
        lead_source: formData.lead_source || null,
        status: formData.status,
        priority: formData.priority,
        score: formData.score,
        estimated_value: formData.estimated_value ? Number.parseFloat(formData.estimated_value) : null,
        notes: formData.notes || null,
        next_follow_up: formData.next_follow_up || null,
        assigned_to: formData.assigned_to,
      }

      if (lead) {
        // Update existing lead
        const { error } = await supabase.from("sales_leads").update(leadData).eq("id", lead.id)

        if (error) throw error
      } else {
        // Create new lead
        const { error } = await supabase.from("sales_leads").insert(leadData)

        if (error) throw error
      }

      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const industries = [
    "Restaurant",
    "Retail",
    "Healthcare",
    "Technology",
    "Manufacturing",
    "Education",
    "Finance",
    "Real Estate",
    "Automotive",
    "Other",
  ]

  const leadSources = [
    "Website",
    "Referral",
    "Cold Call",
    "Email Campaign",
    "Social Media",
    "Trade Show",
    "Advertisement",
    "Partner",
    "Walk-in",
    "Other",
  ]

  const SpeechInput = ({ fieldName, children }: { fieldName: string; children: React.ReactNode }) => (
    <div className="relative">
      {children}
      {("webkitSpeechRecognition" in window || "SpeechRecognition" in window) && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={`absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 ${
            isListening && activeField === fieldName ? "text-red-500" : "text-gray-400"
          }`}
          onClick={() => (isListening && activeField === fieldName ? stopListening() : startListening(fieldName))}
        >
          {isListening && activeField === fieldName ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      )}
    </div>
  )

  const startListening = (fieldName: string) => {
    if (recognitionRef.current && !isListening) {
      setActiveField(fieldName)
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      setActiveField(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company_name">Company Name *</Label>
          <SpeechInput fieldName="company_name">
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => handleInputChange("company_name", e.target.value)}
              required
            />
          </SpeechInput>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_name">Contact Name *</Label>
          <SpeechInput fieldName="contact_name">
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => handleInputChange("contact_name", e.target.value)}
              required
            />
          </SpeechInput>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <SpeechInput fieldName="email">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
          </SpeechInput>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <SpeechInput fieldName="phone">
            <Input id="phone" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} />
          </SpeechInput>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <SpeechInput fieldName="address">
          <Input id="address" value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} />
        </SpeechInput>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select value={formData.industry} onValueChange={(value) => handleInputChange("industry", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lead_source">Lead Source</Label>
          <Select value={formData.lead_source} onValueChange={(value) => handleInputChange("lead_source", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select lead source" />
            </SelectTrigger>
            <SelectContent>
              {leadSources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="closed_won">Closed Won</SelectItem>
              <SelectItem value="closed_lost">Closed Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigned_to">Assigned To</Label>
          <Select value={formData.assigned_to} onValueChange={(value) => handleInputChange("assigned_to", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {salesReps.map((rep) => (
                <SelectItem key={rep.id} value={rep.id}>
                  {rep.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="score">Lead Score: {formData.score}</Label>
        <Slider
          value={[formData.score]}
          onValueChange={(value) => handleInputChange("score", value[0])}
          max={100}
          min={0}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Cold (0)</span>
          <span>Warm (50)</span>
          <span>Hot (100)</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="estimated_value">Estimated Value ($)</Label>
          <Input
            id="estimated_value"
            type="number"
            step="0.01"
            value={formData.estimated_value}
            onChange={(e) => handleInputChange("estimated_value", e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="next_follow_up">Next Follow-up</Label>
          <Input
            id="next_follow_up"
            type="date"
            value={formData.next_follow_up}
            onChange={(e) => handleInputChange("next_follow_up", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <div className="relative">
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder="Additional notes about this lead..."
            rows={3}
          />
          {("webkitSpeechRecognition" in window || "SpeechRecognition" in window) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`absolute right-2 top-2 h-6 w-6 p-0 ${
                isListening && activeField === "notes" ? "text-red-500" : "text-gray-400"
              }`}
              onClick={() => (isListening && activeField === "notes" ? stopListening() : startListening("notes"))}
            >
              {isListening && activeField === "notes" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {lead ? "Update Lead" : "Add Lead"}
        </Button>
      </div>
    </form>
  )
}
