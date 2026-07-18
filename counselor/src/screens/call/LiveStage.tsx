// Live-mode video stage + media bridge. We render LiveKit's grid ourselves
// (instead of <VideoConference/>) so the call's single floating bar owns every
// control — the bridge lifts the local participant's mic/cam/share state and
// toggles up to the parent, where the bar consumes them as a uniform MediaCtl.

import { useEffect } from "react"
import { GridLayout, ParticipantTile, useTracks, useLocalParticipant } from "@livekit/components-react"
import { Track } from "livekit-client"
import type { MediaCtl } from "./InCallAssistant"

export function VideoStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )
  return (
    <GridLayout tracks={tracks} className="!h-full">
      <ParticipantTile />
    </GridLayout>
  )
}

/** Reports the local participant's media state + togglers up as a MediaCtl so the
 *  floating bar can drive mic/camera/screen-share in live mode. */
export function LiveKitMediaBridge({ onMedia }: { onMedia: (m: MediaCtl) => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant()

  useEffect(() => {
    onMedia({
      micOn: isMicrophoneEnabled,
      camOn: isCameraEnabled,
      sharing: isScreenShareEnabled,
      toggleMic: () => { void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled) },
      toggleCam: () => { void localParticipant.setCameraEnabled(!isCameraEnabled) },
      toggleShare: () => { void localParticipant.setScreenShareEnabled(!isScreenShareEnabled) },
    })
  }, [localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled, onMedia])

  return null
}
