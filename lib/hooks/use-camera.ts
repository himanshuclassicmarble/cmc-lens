"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"

interface UseCameraOptions {
  initialFrontCamera?: boolean
  onCameraReady?: (videoWidth: number, videoHeight: number) => void
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  isCameraReady: boolean
  cameraError: string | null
  isFrontCamera: boolean
  availableCameras: MediaDeviceInfo[]
  startCamera: () => Promise<void>
  toggleCamera: () => Promise<void>
  stopCurrentStream: () => void
}

export function useCamera({ initialFrontCamera = false, onCameraReady }: UseCameraOptions = {}): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isCameraReady, setIsCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isFrontCamera, setIsFrontCamera] = useState(initialFrontCamera)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])

  const getAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setAvailableCameras(videoDevices)
      return videoDevices
    } catch (err) {
      console.error("Error getting camera devices:", err)
      return []
    }
  }, [])

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setIsCameraReady(false)
      stopCurrentStream()
      setCameraError(null) // Clear previous errors

      const cameras = await getAvailableCameras()
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30 },
        },
      }

      if (cameras.length > 1) {
        constraints.video = {
          ...(typeof constraints.video === "object" && constraints.video !== null ? constraints.video : {}),
          facingMode: isFrontCamera ? "user" : "environment",
        }
      } else if (cameras.length === 1) {
        constraints.video = {
          ...(typeof constraints.video === "object" && constraints.video !== null ? constraints.video : {}),
          deviceId: { exact: cameras[0].deviceId },
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = mediaStream

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true)
          if (videoRef.current && onCameraReady) {
            onCameraReady(videoRef.current.videoWidth, videoRef.current.videoHeight)
          }
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start camera"
      // This console.error is the one highlighted by the user.
      // In a production environment, consider logging to an error reporting service.
      console.error("Camera error:", errorMessage)
      setCameraError(errorMessage)
      setIsCameraReady(false)
    }
  }, [isFrontCamera, stopCurrentStream, getAvailableCameras, onCameraReady])

  const toggleCamera = useCallback(async () => {
    if (availableCameras.length <= 1) {
      setCameraError("Only one camera available")
      return
    }
    setIsFrontCamera((prev) => !prev)
  }, [availableCameras.length])

  useEffect(() => {
    startCamera()
    return () => stopCurrentStream()
  }, [startCamera, stopCurrentStream])

  useEffect(() => {
    if (availableCameras.length > 0) {
      startCamera()
    }
  }, [isFrontCamera, startCamera, availableCameras.length])

  return {
    videoRef,
    canvasRef,
    isCameraReady,
    cameraError,
    isFrontCamera,
    availableCameras,
    startCamera,
    toggleCamera,
    stopCurrentStream,
  }
}
