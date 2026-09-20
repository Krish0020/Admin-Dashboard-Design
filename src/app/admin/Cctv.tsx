import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Maximize2, X } from "lucide-react";
import { Btn, Card, Heading, Muted, Notice } from "../../ui/primitives";
import { c, font } from "../../ui/theme";

const CAMERAS = [
  { id: "main-gate", name: "Main gate" },
  { id: "parking", name: "Parking area" },
  { id: "lobby", name: "Lobby" },
  { id: "back-gate", name: "Back gate" },
  { id: "terrace", name: "Terrace" },
  { id: "basement", name: "Basement parking" },
];

/**
 * Surveillance wall.
 *
 * The society has no IP cameras installed yet, so every tile plays this
 * device's own camera through getUserMedia — enough to prove the layout, the
 * live indicators and the expand interaction work. Swapping in real hardware
 * means replacing the single `stream` prop with one RTSP/ONVIF stream URL per
 * camera (browsers can't play RTSP directly, so that also needs a small media
 * server to repackage the feed as HLS or WebRTC).
 */
export default function Cctv() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Release the camera when the committee member leaves this screen —
  // otherwise the webcam light stays on for the rest of the session.
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const enable = async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(s);
    } catch (err) {
      const name = (err as Error)?.name;
      setError(
        name === "NotAllowedError"
          ? "Camera access was refused. Allow the camera for this site in your browser's address bar, then try again."
          : name === "NotFoundError"
          ? "No camera found on this device."
          : "The camera could not be opened on this device."
      );
    }
  };

  const disable = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setExpanded(null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading>Surveillance wall</Heading>
          <Muted className="mt-0.5">
            {stream
              ? `${CAMERAS.length} of ${CAMERAS.length} cameras online · ${new Date(tick).toLocaleTimeString("en-IN")}`
              : "Cameras are offline. Turn the feed on to start monitoring."}
          </Muted>
        </div>
        {stream ? (
          <Btn variant="danger" onClick={disable}>
            <CameraOff size={15} /> Turn feed off
          </Btn>
        ) : (
          <Btn onClick={enable}>
            <Camera size={15} /> Turn feed on
          </Btn>
        )}
      </Card>

      {error && <Notice>{error}</Notice>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {CAMERAS.map((cam) => (
          <Tile
            key={cam.id}
            name={cam.name}
            stream={stream}
            tick={tick}
            onExpand={() => stream && setExpanded(cam.name)}
          />
        ))}
      </div>

      <Muted>
        Demo note: no IP cameras are wired up yet, so every tile mirrors this device's
        camera. Real feeds plug in per camera as an RTSP or ONVIF stream.
      </Muted>

      {expanded && stream && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setExpanded(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${expanded} full view`}
        >
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: c.ink, fontFamily: font.mono }}>
                {expanded}
              </span>
              <button onClick={() => setExpanded(null)} style={{ color: c.inkMuted }} aria-label="Close full view">
                <X size={22} />
              </button>
            </div>
            <Tile name={expanded} stream={stream} tick={tick} onExpand={() => {}} />
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({
  name,
  stream,
  tick,
  onExpand,
}: {
  name: string;
  stream: MediaStream | null;
  tick: number;
  onExpand: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <button
      onClick={onExpand}
      className="group relative aspect-video overflow-hidden rounded text-left"
      style={{ background: "#000", border: `1px solid ${stream ? `${c.red}77` : c.line}` }}
    >
      {stream ? (
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #07150f 0px, #07150f 2px, #040c08 2px, #040c08 9px)",
          }}
        >
          <CameraOff size={18} style={{ color: "#3f5a4b" }} />
          <span className="text-[10px] tracking-wide" style={{ color: "#3f5a4b", fontFamily: font.mono }}>
            STANDBY
          </span>
        </div>
      )}

      <span
        className="absolute left-2 top-2 flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold"
        style={{ background: "rgba(0,0,0,0.65)", color: stream ? "#ef8e85" : "#7e9186" }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: stream ? c.red : "#4d6357" }} />
        {stream ? "LIVE" : "OFFLINE"}
      </span>

      <span
        className="absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-medium"
        style={{ background: "rgba(0,0,0,0.6)", color: c.ink, fontFamily: font.mono }}
      >
        {name}
      </span>

      {stream && (
        <>
          <span
            className="absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[9px]"
            style={{ background: "rgba(0,0,0,0.6)", color: c.ink, fontFamily: font.mono }}
          >
            {new Date(tick).toLocaleTimeString("en-IN")}
          </span>
          <span className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: c.ink }}>
            <Maximize2 size={14} />
          </span>
        </>
      )}
    </button>
  );
}