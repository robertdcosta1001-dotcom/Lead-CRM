"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Mail, Phone, MapPin, Calendar, DollarSign, User, Edit, Building } from "lucide-react"
import { format } from "date-fns"

interface Employee {
  id: string
  email: string
  first_name: string
  last_name: string
  role: "admin" | "manager" | "employee" | "sales_rep"
  department: string | null
  position: string | null
  hire_date: string | null
  phone: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  hourly_rate: number | null
  salary: number | null
  manager_id: string | null
  is_active: boolean
  created_at: string
  manager?: {
    first_name: string
    last_name: string
  }
}

interface EmployeeDetailsProps {
  employee: Employee
  onClose: () => void
  onEdit: () => void
  canEdit: boolean
}

export function EmployeeDetails({ employee, onClose, onEdit, canEdit }: EmployeeDetailsProps) {
  const getRoleBadge = (role: string) => {
    const roleColors = {
      admin: "bg-red-100 text-red-800",
      manager: "bg-blue-100 text-blue-800",
      sales_rep: "bg-green-100 text-green-800",
      employee: "bg-gray-100 text-gray-800",
    }

    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || "bg-gray-100 text-gray-800"}>
        {role.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-lg font-medium text-primary">
              {employee.first_name[0]}
              {employee.last_name[0]}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {employee.first_name} {employee.last_name}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              {getRoleBadge(employee.role)}
              {!employee.is_active && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  Inactive
                </Badge>
              )}
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
            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{employee.email}</p>
              </div>
            </div>

            {employee.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{employee.phone}</p>
                </div>
              </div>
            )}

            {employee.address && (
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{employee.address}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Employment Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {employee.department && (
              <div>
                <p className="text-sm font-medium">Department</p>
                <p className="text-sm text-muted-foreground">{employee.department}</p>
              </div>
            )}

            {employee.position && (
              <div>
                <p className="text-sm font-medium">Position</p>
                <p className="text-sm text-muted-foreground">{employee.position}</p>
              </div>
            )}

            {employee.hire_date && (
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Hire Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(employee.hire_date), "MMMM dd, yyyy")}
                  </p>
                </div>
              </div>
            )}

            {employee.manager && (
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Reports To</p>
                  <p className="text-sm text-muted-foreground">
                    {employee.manager.first_name} {employee.manager.last_name}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compensation */}
        {(employee.hourly_rate || employee.salary) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Compensation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {employee.hourly_rate && (
                <div>
                  <p className="text-sm font-medium">Hourly Rate</p>
                  <p className="text-sm text-muted-foreground">${employee.hourly_rate.toFixed(2)}/hour</p>
                </div>
              )}

              {employee.salary && (
                <div>
                  <p className="text-sm font-medium">Annual Salary</p>
                  <p className="text-sm text-muted-foreground">${employee.salary.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        {(employee.emergency_contact_name || employee.emergency_contact_phone) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5" />
                <span>Emergency Contact</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {employee.emergency_contact_name && (
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{employee.emergency_contact_name}</p>
                </div>
              )}

              {employee.emergency_contact_phone && (
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{employee.emergency_contact_phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
