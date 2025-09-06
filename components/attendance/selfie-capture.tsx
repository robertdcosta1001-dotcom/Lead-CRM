"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, RotateCcw, Check, X, MapPin, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface SelfieCaptureProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (selfieUrl: string, location: { lat: number; lng: number }) => void
  userId: string
  action: "clock_in" | "clock_out"
}

export function SelfieCapture({ isOpen, onClose, onSuccess, userId, action }: SelfieCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const supabase = createClient()

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user", // Front camera for selfies
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsCapturing(true)
      }
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions.")
      console.error("Error accessing camera:", err)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCapturing(false)
  }, [])

  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          reject(new Error("Location access denied"))
        },
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    try {
      // Get current location
      const currentLocation = await getCurrentLocation()
      setLocation(currentLocation)

      // Capture photo
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)

        const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8)
        setCapturedImage(imageDataUrl)
        stopCamera()
      }
    } catch (err) {
      setError("Failed to capture photo or get location. Please try again.")
      console.error("Error capturing photo:", err)
    }
  }

  const uploadSelfie = async (imageDataUrl: string): Promise<string> => {
    // Convert data URL to blob
    const response = await fetch(imageDataUrl)
    const blob = await response.blob()

    // Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `selfies/${userId}/${action}_${timestamp}.jpg`

    // Upload to Supabase Storage (assuming you have a 'selfies' bucket)
    const { data, error } = await supabase.storage.from("selfies").upload(filename, blob, {
      contentType: "image/jpeg",
      upsert: false,
    })

    if (error) {
      throw new Error("Failed to upload selfie")
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("selfies").getPublicUrl(filename)

    return publicUrl
  }

  const confirmCapture = async () => {
    if (!capturedImage || !location) return

    setIsProcessing(true)
    try {
      // Upload selfie to storage
      const selfieUrl = await uploadSelfie(capturedImage)

      // Call success callback with selfie URL and location
      onSuccess(selfieUrl, location)

      // Reset state
      setCapturedImage(null)
      setLocation(null)
      onClose()
    } catch (err) {
      setError("Failed to process selfie. Please try again.")
      console.error("Error processing selfie:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setLocation(null)
    startCamera()
  }

  const handleClose = () => {
    stopCamera()
    setCapturedImage(null)
    setLocation(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>{action === "clock_in" ? "Clock In" : "Clock Out"} Verification</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!isCapturing && !capturedImage && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="font-medium">Selfie Verification Required</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Take a selfie to verify your identity and location for{" "}
                      {action === "clock_in" ? "clocking in" : "clocking out"}.
                    </p>
                  </div>
                  <Button onClick={startCamera} className="w-full">
                    <Camera className="mr-2 h-4 w-4" />
                    Start Camera
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isCapturing && (
            <div className="space-y-4">
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-black" />
                <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-full opacity-50"></div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={capturePhoto} className="flex-1">
                  <Camera className="mr-2 h-4 w-4" />
                  Capture
                </Button>
                <Button onClick={handleClose} variant="outline">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Position your face in the circle and ensure good lighting
              </p>
            </div>
          )}

          {capturedImage && (
            <div className="space-y-4">
              <div className="relative">
                <img src={capturedImage || "/placeholder.svg"} alt="Captured selfie" className="w-full rounded-lg" />
                {location && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    Location verified
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button onClick={confirmCapture} className="flex-1" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Confirm
                    </>
                  )}
                </Button>
                <Button onClick={retakePhoto} variant="outline" disabled={isProcessing}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Photo and location will be saved for verification
              </p>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
