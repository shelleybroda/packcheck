import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, X, AlertCircle, ArrowLeft, Image as ImageIcon, Check } from 'lucide-react';
import { ProcessedImage, resizeAndCompressImage } from '../utils/image';

interface CameraCaptureProps {
  listName: string;
  remainingCount: number;
  onPhotoSelected: (processed: ProcessedImage) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  listName,
  remainingCount,
  onPhotoSelected,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Guards against race conditions, unmount leaks, and stale async resolutions
  const isMountedRef = useRef<boolean>(true);
  const requestGenerationRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const readinessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraState, setCameraState] = useState<'requesting' | 'live' | 'captured' | 'error'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [capturedPreview, setCapturedPreview] = useState<ProcessedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);

  // Safely stop all active media tracks
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('[PackCheck] Track stop warning:', e);
        }
      });
      streamRef.current = null;
    }
  }, []);

  // Cancel any running requestAnimationFrame loop and readiness timers
  const clearReadinessChecks = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (readinessTimeoutRef.current !== null) {
      clearTimeout(readinessTimeoutRef.current);
      readinessTimeoutRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    // Increment generation so any in-flight previous getUserMedia calls are invalidated
    const currentGeneration = ++requestGenerationRef.current;

    clearReadinessChecks();
    stopTracks();

    if (!isMountedRef.current) return;

    setCameraState('requesting');
    setErrorMessage('');
    setIsCameraReady(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (isMountedRef.current && requestGenerationRef.current === currentGeneration) {
        setCameraState('error');
        setErrorMessage(
          'In-app camera streaming is not supported by your browser. Please use the device photo capture button below.'
        );
      }
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // CRITICAL GUARD: If component unmounted or another request was initiated while waiting for permission,
      // stop all tracks of this stream immediately to prevent stream leak / green light staying on.
      if (!isMountedRef.current || requestGenerationRef.current !== currentGeneration) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        // Bounded readiness check: if camera doesn't provide non-zero dimensions within 7s, fail gracefully
        readinessTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current || requestGenerationRef.current !== currentGeneration) return;
          clearReadinessChecks();
          stopTracks();
          setCameraState('error');
          setErrorMessage(
            'Camera opened, but video frames could not be read. Please try retrying or take a photo with your device camera below.'
          );
        }, 7000);

        video.onloadedmetadata = () => {
          if (!isMountedRef.current || requestGenerationRef.current !== currentGeneration) return;

          video.play().catch((playErr) => {
            console.warn('[PackCheck] Video play warning:', playErr);
          });

          // Continuously verify non-zero dimensions with requestAnimationFrame
          const checkDimensions = () => {
            if (!isMountedRef.current || requestGenerationRef.current !== currentGeneration) return;

            if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
              clearReadinessChecks();
              setIsCameraReady(true);
              setCameraState('live');
            } else {
              rafIdRef.current = requestAnimationFrame(checkDimensions);
            }
          };

          rafIdRef.current = requestAnimationFrame(checkDimensions);
        };
      }
    } catch (err: any) {
      // If unmounted or stale generation, discard error without updating state
      if (!isMountedRef.current || requestGenerationRef.current !== currentGeneration) {
        return;
      }

      clearReadinessChecks();
      stopTracks();
      setCameraState('error');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(
          'Camera access was denied. Please allow camera permissions in your browser settings, or use the device photo capture button below.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device was detected on your device. You can choose a photo from your device.');
      } else {
        setErrorMessage(
          err.message || 'Unable to open camera stream. Please use the device photo capture button below.'
        );
      }
    }
  }, [clearReadinessChecks, stopTracks]);

  useEffect(() => {
    isMountedRef.current = true;
    startCamera();

    // Cleanup: stop rAF, cancel timeouts, stop tracks, and mark unmounted
    return () => {
      isMountedRef.current = false;
      requestGenerationRef.current++;
      clearReadinessChecks();
      stopTracks();
    };
  }, [startCamera, clearReadinessChecks, stopTracks]);

  // Capture current video frame onto canvas
  const handleCaptureFrame = async () => {
    if (!videoRef.current || !isCameraReady || isProcessing) return;

    try {
      setIsProcessing(true);
      const video = videoRef.current;
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width === 0 || height === 0) {
        throw new Error('Camera frame is not ready. Please wait a moment and try again.');
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize image canvas.');

      ctx.drawImage(video, 0, 0, width, height);

      // Convert canvas to Blob
      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
      });

      if (!blob) throw new Error('Failed to capture photo frame.');

      // Release active camera tracks once frame is captured
      clearReadinessChecks();
      stopTracks();

      // Compress and scale client-side
      const processed = await resizeAndCompressImage(blob, 1280, 0.82);

      if (isMountedRef.current) {
        setCapturedPreview(processed);
        setCameraState('captured');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        alert(err.message || 'Failed to capture frame. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  };

  // Handle fallback file / phone camera input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Invalidate any pending getUserMedia calls before stopping tracks
    requestGenerationRef.current++;

    try {
      setIsProcessing(true);
      clearReadinessChecks();
      stopTracks();

      const processed = await resizeAndCompressImage(file, 1280, 0.82);

      if (isMountedRef.current) {
        setCapturedPreview(processed);
        setCameraState('captured');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        alert(err.message || 'Could not process photo file.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    startCamera();
  };

  const handleUsePhoto = () => {
    if (capturedPreview) {
      clearReadinessChecks();
      stopTracks();
      onPhotoSelected(capturedPreview);
    }
  };

  const handleCancel = () => {
    // Invalidate any pending camera requests and stop tracks immediately
    requestGenerationRef.current++;
    clearReadinessChecks();
    stopTracks();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan items camera"
      className="fixed inset-0 z-50 bg-[#163323] text-white flex flex-col justify-between overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-md pt-safe z-10">
        <button
          onClick={handleCancel}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-white rounded-full transition-colors active:scale-95"
          aria-label="Cancel camera scan"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center px-2 flex-1">
          <p className="text-xs font-semibold tracking-wider uppercase text-white/60">
            {listName} checklist
          </p>
          <p className="text-sm font-medium text-white truncate">
            {remainingCount} item{remainingCount === 1 ? '' : 's'} remaining to verify
          </p>
        </div>

        <div className="w-11" />
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {cameraState === 'captured' && capturedPreview ? (
          // Frozen Preview State
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img
              src={capturedPreview.dataUrl}
              alt="Captured layout preview"
              className="max-h-full max-w-full object-contain"
            />
            <div className="absolute top-4 left-4 right-4 bg-black/60 backdrop-blur-md rounded-xl p-3 text-center text-xs text-white/90 border border-white/10">
              Photo captured ({capturedPreview.width}×{capturedPreview.height}px · {capturedPreview.sizeKb} KB)
            </div>
          </div>
        ) : cameraState === 'error' ? (
          // Camera Error & Device Fallback State
          <div className="max-w-md mx-6 p-6 rounded-2xl bg-[#1E3F2D] border border-white/10 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Camera Unavailable</h3>
            <p className="text-sm text-white/80 mb-6 leading-relaxed">{errorMessage}</p>

            <div className="space-y-3">
              {/* Device Photo Fallback Trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#D96B27] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-[#c45e1e] active:scale-[0.98] transition-all"
              >
                <Camera className="w-5 h-5" />
                Take or choose a photo
              </button>

              <button
                type="button"
                onClick={startCamera}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 text-white font-medium text-xs flex items-center justify-center gap-2 hover:bg-white/20 active:scale-[0.98] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry camera permission
              </button>
            </div>
          </div>
        ) : (
          // Live Camera Stream State with iPhone playsInline, muted, autoPlay
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              webkit-playsinline="true"
              muted
              autoPlay
              className="w-full h-full object-cover"
              aria-label="Live camera viewfinder"
            />

            {/* Viewfinder Aiming Overlay */}
            <div className="pointer-events-none absolute inset-8 border-2 border-white/40 rounded-3xl flex flex-col justify-between p-4">
              <div className="self-center bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-white/90 border border-white/10">
                Lay items flat under good lighting
              </div>
              <div className="flex justify-between items-center text-[11px] text-white/70">
                <span>Spread items out</span>
                <span>Keep camera steady</span>
              </div>
            </div>

            {/* Camera Requesting Spinner */}
            {cameraState === 'requesting' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="text-sm text-white/80 font-medium">Starting camera...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden Fallback Input with capture='environment' */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Bottom Controls Bar */}
      <div className="px-6 py-5 bg-black/70 backdrop-blur-lg pb-safe z-10">
        {cameraState === 'captured' ? (
          // Retake or Use Photo buttons
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-white/15 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-white/25 active:scale-[0.98] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Retake
            </button>
            <button
              type="button"
              onClick={handleUsePhoto}
              className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-[#D96B27] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-[#c45e1e] active:scale-[0.98] transition-all"
            >
              <Check className="w-5 h-5" />
              Use photo
            </button>
          </div>
        ) : (
          // Live Capture & Fallback Controls
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Take or choose photo fallback */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[48px] px-3 py-2 flex flex-col items-center justify-center text-white/80 hover:text-white active:scale-95 transition-transform"
              aria-label="Upload photo from device"
            >
              <ImageIcon className="w-6 h-6 mb-1" />
              <span className="text-[11px] font-medium">From photo</span>
            </button>

            {/* Primary Shutter Button */}
            <button
              type="button"
              onClick={handleCaptureFrame}
              disabled={!isCameraReady || isProcessing || cameraState !== 'live'}
              className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 shadow-2xl active:scale-90 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Capture photo"
            >
              <div className="w-full h-full rounded-full bg-white hover:bg-white/90 active:bg-amber-100 transition-colors" />
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleCancel}
              className="min-h-[48px] px-3 py-2 flex flex-col items-center justify-center text-white/80 hover:text-white active:scale-95 transition-transform"
              aria-label="Cancel scan"
            >
              <ArrowLeft className="w-6 h-6 mb-1" />
              <span className="text-[11px] font-medium">Cancel</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
