"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Download } from "lucide-react"

interface AttendanceImageViewerProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
}

export function AttendanceImageViewer({ isOpen, onClose, imageUrl }: AttendanceImageViewerProps) {
  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = `attendance-selfie-${new Date().toISOString().split("T")[0]}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Attendance Selfie</span>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl || "/placeholder.svg"}
                alt="Attendance selfie"
                className="w-full rounded-lg max-h-96 object-contain bg-muted"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">No image available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
