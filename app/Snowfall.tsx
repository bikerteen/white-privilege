"use client";

import { useEffect, useRef, useState } from "react";
import PixelSnow from "./PixelSnow";
import { orientationGravity } from "./snow-physics.mjs";

type Status = "hidden" | "ready" | "requesting" | "waiting" | "enabled" | "denied" | "unavailable";
type MotionAPI = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

export default function Snowfall() {
  const gravityRef = useRef({ x: 0, y: 1, active: false });
  const [status, setStatus] = useState<Status>("hidden");
  const [listening, setListening] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      requestId.current++;
      setListening(false);
      gravityRef.current.active = false;
      setStatus(!preference.matches && window.isSecureContext &&
        "DeviceOrientationEvent" in window && navigator.maxTouchPoints > 0 ? "ready" : "hidden");
    };
    update();
    preference.addEventListener("change", update);
    return () => {
      requestId.current++;
      preference.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!listening) return;
    let received = false;
    let lastReading: { beta: number; gamma: number } | null = null;
    const applyReading = () => {
      if (!lastReading || document.hidden) return;
      const angle = window.screen.orientation?.angle ?? window.orientation ?? 0;
      const direction = orientationGravity(lastReading.beta, lastReading.gamma, angle);
      if (!direction) return;
      if (direction.x || direction.y) {
        gravityRef.current.x = direction.x;
        gravityRef.current.y = direction.y;
      }
      gravityRef.current.active = true;
      if (!received) {
        received = true;
        window.clearTimeout(timeout);
        setStatus("enabled");
      }
    };
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      lastReading = { beta: event.beta, gamma: event.gamma };
      applyReading();
    };
    const timeout = window.setTimeout(() => {
      if (received) return;
      setListening(false);
      setStatus("unavailable");
    }, 8000);
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    window.screen.orientation?.addEventListener("change", applyReading);
    window.addEventListener("orientationchange", applyReading);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("deviceorientation", onOrientation);
      window.screen.orientation?.removeEventListener("change", applyReading);
      window.removeEventListener("orientationchange", applyReading);
      gravityRef.current.active = false;
    };
  }, [listening]);

  async function toggleTilt() {
    if (listening) {
      setListening(false);
      setStatus("ready");
      return;
    }
    const id = ++requestId.current;
    setStatus("requesting");
    try {
      const api = window.DeviceOrientationEvent as MotionAPI;
      // This call must remain inside the user's tap for iOS permission prompts.
      const permission = api.requestPermission ? await api.requestPermission() : "granted";
      if (id !== requestId.current) return;
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      setStatus("waiting");
      setListening(true);
    } catch {
      if (id === requestId.current) setStatus("unavailable");
    }
  }

  const message = status === "denied" ? "Motion access is off. You can still enjoy the snow."
    : status === "unavailable" ? "Tilt isn’t available right now. You can try again."
    : status === "waiting" ? "Tilt your phone to start."
    : status === "enabled" ? "Tip your phone — the snow follows."
    : "";

  return (
    <>
      <div className="snow-background" aria-hidden="true">
        <PixelSnow
          color="#ffffff" variant="snowflake" density={0.5} speed={3}
          wind={0.25} flakeSize={1} pixelSize={1} glow={1.95}
          mouseInteraction accumulate lightMode={false} dpr={1.5}
          gravityRef={gravityRef}
        />
      </div>
      {status !== "hidden" && (
        <div className="tilt-control">
          <button type="button" onClick={toggleTilt}
            disabled={status === "requesting"} aria-pressed={listening}
            aria-describedby={message ? "tilt-status" : undefined}>
            {status === "requesting" ? "Enabling tilt…" : listening ? "Disable tilt" : "Enable tilt"}
          </button>
          <p id="tilt-status" role="status">{message}</p>
        </div>
      )}
    </>
  );
}
