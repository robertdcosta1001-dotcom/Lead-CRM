"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, FileSpreadsheet } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import "jspdf-autotable"

interface LeadExportProps {
  userRole: "admin" | "manager" | "employee" | "sales_rep"
}

export function LeadExport({ userRole }: LeadExportProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  if (userRole !== "admin" && userRole !== "manager") {
    return null
  }

  const fetchLeadsData = async () => {
    const { data, error } = await supabase
      .from("sales_leads")
      .select(`
        *,
        assigned_profile:profiles!sales_leads_assigned_to_fkey(first_name, last_name)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  }

  const exportToExcel = async () => {
    setLoading(true)
    try {
      const leads = await fetchLeadsData()

      const exportData = leads.map((lead) => ({
        "Company Name": lead.company_name,
        "Contact Name": lead.contact_name,
        Email: lead.email || "",
        Phone: lead.phone || "",
        Industry: lead.industry || "",
        Status: lead.status,
        Priority: lead.priority,
        Score: lead.score,
        "Estimated Value": lead.estimated_value || 0,
        "Lead Source": lead.lead_source || "",
        "Assigned To": lead.assigned_profile
          ? `${lead.assigned_profile.first_name} ${lead.assigned_profile.last_name}`
          : "",
        "Created Date": new Date(lead.created_at).toLocaleDateString(),
        "Next Follow-up": lead.next_follow_up || "",
        Notes: lead.notes || "",
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Leads")

      XLSX.writeFile(wb, `leads_export_${new Date().toISOString().split("T")[0]}.xlsx`)
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = async () => {
    setLoading(true)
    try {
      const leads = await fetchLeadsData()

      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text("Sales Leads Report", 20, 20)
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30)

      const tableData = leads.map((lead) => [
        lead.company_name,
        lead.contact_name,
        lead.email || "",
        lead.status,
        lead.priority,
        lead.score.toString(),
        lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : "$0",
      ])

      doc.autoTable({
        head: [["Company", "Contact", "Email", "Status", "Priority", "Score", "Value"]],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
      })

      doc.save(`leads_report_${new Date().toISOString().split("T")[0]}.pdf`)
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading}>
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Export Excel
      </Button>
      <Button variant="outline" size="sm" onClick={exportToPDF} disabled={loading}>
        <FileText className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
    </div>
  )
}
