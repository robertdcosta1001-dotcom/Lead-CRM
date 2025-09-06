"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Users, Plus, Search, Filter, Edit, Eye, UserCheck, UserX, Mail, Phone } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { EmployeeForm } from "./employee-form"
import { EmployeeDetails } from "./employee-details"

interface Profile {
  id: string
  first_name: string
  last_name: string
  role: "admin" | "manager" | "employee" | "sales_rep"
}

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

export function EmployeeManagement({ profile }: { profile: Profile }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showEditEmployee, setShowEditEmployee] = useState(false)
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [departments, setDepartments] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    filterEmployees()
  }, [employees, searchTerm, roleFilter, departmentFilter, statusFilter])

  const loadEmployees = async () => {
    try {
      const { data: employeeData } = await supabase
        .from("profiles")
        .select(`
          *,
          manager:manager_id (
            first_name,
            last_name
          )
        `)
        .order("first_name", { ascending: true })

      setEmployees(employeeData || [])

      // Extract unique departments
      const uniqueDepartments = [...new Set(employeeData?.map((emp) => emp.department).filter(Boolean) || [])]
      setDepartments(uniqueDepartments)
    } catch (error) {
      console.error("Error loading employees:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterEmployees = () => {
    let filtered = employees

    if (searchTerm) {
      filtered = filtered.filter((emp) =>
        `${emp.first_name} ${emp.last_name} ${emp.email}`.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((emp) => emp.role === roleFilter)
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((emp) => emp.department === departmentFilter)
    }

    if (statusFilter !== "all") {
      const isActive = statusFilter === "active"
      filtered = filtered.filter((emp) => emp.is_active === isActive)
    }

    setFilteredEmployees(filtered)
  }

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

  const handleEmployeeAction = (action: "view" | "edit", employee: Employee) => {
    setSelectedEmployee(employee)
    if (action === "view") {
      setShowEmployeeDetails(true)
    } else {
      setShowEditEmployee(true)
    }
  }

  const handleEmployeeStatusToggle = async (employeeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !currentStatus }).eq("id", employeeId)

      if (error) throw error

      await loadEmployees()
    } catch (error) {
      console.error("Error updating employee status:", error)
    }
  }

  const canManageEmployees = profile.role === "admin" || profile.role === "manager"

  if (loading) {
    return <div className="text-center py-8">Loading employees...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground mt-1">Manage employee profiles, roles, and organizational structure.</p>
        </div>

        {canManageEmployees && (
          <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <EmployeeForm
                onSuccess={() => {
                  setShowAddEmployee(false)
                  loadEmployees()
                }}
                onCancel={() => setShowAddEmployee(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">{employees.filter((e) => e.is_active).length} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.filter((e) => e.role === "manager" || e.role === "admin").length}
            </div>
            <p className="text-xs text-muted-foreground">Management staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.filter((e) => e.role === "sales_rep").length}</div>
            <p className="text-xs text-muted-foreground">Sales representatives</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="sales_rep">Sales Rep</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {employee.first_name[0]}
                      {employee.last_name[0]}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      {getRoleBadge(employee.role)}
                      {!employee.is_active && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{employee.email}</span>
                      </div>

                      {employee.department && (
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{employee.department}</span>
                        </div>
                      )}

                      {employee.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                    </div>

                    {employee.manager && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Reports to: {employee.manager.first_name} {employee.manager.last_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEmployeeAction("view", employee)}>
                    <Eye className="h-4 w-4" />
                  </Button>

                  {canManageEmployees && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleEmployeeAction("edit", employee)}>
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEmployeeStatusToggle(employee.id, employee.is_active)}
                      >
                        {employee.is_active ? (
                          <UserX className="h-4 w-4 text-red-500" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {filteredEmployees.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No employees found matching the current filters.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditEmployee} onOpenChange={setShowEditEmployee}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeForm
              employee={selectedEmployee}
              onSuccess={() => {
                setShowEditEmployee(false)
                setSelectedEmployee(null)
                loadEmployees()
              }}
              onCancel={() => {
                setShowEditEmployee(false)
                setSelectedEmployee(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Employee Details Dialog */}
      <Dialog open={showEmployeeDetails} onOpenChange={setShowEmployeeDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeDetails
              employee={selectedEmployee}
              onClose={() => {
                setShowEmployeeDetails(false)
                setSelectedEmployee(null)
              }}
              onEdit={() => {
                setShowEmployeeDetails(false)
                setShowEditEmployee(true)
              }}
              canEdit={canManageEmployees}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
