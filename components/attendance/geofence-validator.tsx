"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface GeofenceValidatorProps {
  userLocation: { lat: number; lng: number } | null
  workLocation: { lat: number; lng: number; radius: number }
  onValidationChange: (isValid: boolean) => void
}

export function GeofenceValidator({ userLocation, workLocation, onValidationChange }: GeofenceValidatorProps) {
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean | null>(null)
  const [distance, setDistance] = useState<number | null>(null)

  useEffect(() => {
    if (userLocation) {
      const calculatedDistance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        workLocation.lat,
        workLocation.lng,
      )

      setDistance(calculatedDistance)
      const isValid = calculatedDistance <= workLocation.radius
      setIsWithinGeofence(isValid)
      onValidationChange(isValid)
    }
  }, [userLocation, workLocation, onValidationChange])

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lng2 - lng1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`
    }
    return `${(meters / 1000).toFixed(1)}km`
  }

  if (!userLocation) {
    return (
      <Card className="border-yellow-200">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2 text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Getting your location...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-2 ${isWithinGeofence ? "border-green-200" : "border-red-200"}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <MapPin className="h-4 w-4" />
          <span>Location Verification</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            {isWithinGeofence ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Within work area
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">
                <XCircle className="h-3 w-3 mr-1" />
                Outside work area
              </Badge>
            )}
          </div>

          {distance !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Distance:</span>
              <span className="text-sm font-medium">{formatDistance(distance)}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Allowed radius:</span>
            <span className="text-sm font-medium">{formatDistance(workLocation.radius)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
