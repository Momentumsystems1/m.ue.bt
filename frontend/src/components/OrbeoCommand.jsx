/**
 * OrbeoCommand v5
 * - Solo el orbe visible, sin botones ni órbitas
 * - Click → pide GPS, vuela a posición, mapa 3D pitch 70°
 * - Arrastrable
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Navigation, LocateFixed, AlertCircle } from "lucide-react";

const BG   = "rgba(2,10,20,0.93)";
const CYAN = "#22d3ee";

export default function OrbeoCommand({
  onLocateMe,
  mapRef,            // ref al mapa MapLibre pasado desde CommandCenter
}) {
  const [orbPos, setOrbPos] = useState({
    x: window.innerWidth  / 2,
    y: window.innerHeight - 160,
  });
  const dragging  = useRef(false);
  const hasMoved  = useRef(false);
  const dragStart = useRef({ mx:0, my:0, ox:0, oy:0 });

  // Estado GPS
  const [gpsState, setGpsState] = useState("idle"); // idle | locating | tracking | denied

  const onMouseDown = useCallback(e => {
    if (e.button !== 0) return;
    dragging.current  = true;
    hasMoved.current  = false;
    dragStart.current = { mx:e.clientX, my:e.clientY, ox:orbPos.x, oy:orbPos.y };
    e.preventDefault();
  }, [orbPos]);

  useEffect(() => {
    const mv = e => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;
      setOrbPos({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
    };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup",   up);
    return () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup",   up);
    };
  }, []);

  const flyToGPS = useCallback((lat, lon) => {
    const map = mapRef?.current;
    if (!map) return;
    map.flyTo({
      center:  [lon, lat],
      zoom:    18,
      pitch:   70,
      bearing: 0,
      speed:   1.4,
      curve:   1.6,
      duration: 2800,
    });
  }, [mapRef]);

  const handleClick = useCallback(() => {
    if (hasMoved.current) return;
    if (!navigator.geolocation) {
      setGpsState("denied");
      return;
    }
    setGpsState("locating");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsState("tracking");
        flyToGPS(pos.coords.latitude, pos.coords.longitude);
        onLocateMe?.();
      },
      err => {
        console.warn("GPS denied:", err.message);
        setGpsState("denied");
        // Solicitar permiso explícito si fue denegado
        if (err.code === 1) {
          alert("Para usar esta función activa la ubicación en tu navegador y recarga la página.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [flyToGPS, onLocateMe]);

  // Color según estado
  const color = gpsState === "tracking" ? "#4ade80"
              : gpsState === "locating" ? "#fbbf24"
              : gpsState === "denied"   ? "#f87171"
              : CYAN;

  const Icon = gpsState === "denied"   ? AlertCircle
             : gpsState === "tracking" ? LocateFixed
             : Navigation;

  const label = gpsState === "locating" ? "LOCALIZANDO…"
              : gpsState === "tracking" ? "EN RUTA"
              : gpsState === "denied"   ? "SIN GPS"
              : "ORBEO";

  return (
    <motion.div
      onMouseDown={onMouseDown}
      onClick={handleClick}
      animate={{
        boxShadow: gpsState === "locating"
          ? [`0 0 0px ${color}`, `0 0 80px ${color}`, `0 0 0px ${color}`]
          : gpsState === "tracking"
            ? `0 0 60px ${color}88`
            : `0 0 30px ${color}44`,
      }}
      transition={gpsState === "locating"
        ? { repeat: Infinity, duration: 0.9, ease: "easeInOut" }
        : { duration: 0.4 }}
      style={{
        position: "fixed",
        left:  orbPos.x - 100,
        top:   orbPos.y - 100,
        width:  200,
        height: 200,
        borderRadius: "50%",
        background: BG,
        border: `3px solid ${color}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: dragging.current ? "grabbing" : "pointer",
        zIndex: 200,
        userSelect: "none",
        transition: "border-color 0.3s",
      }}
    >
      <motion.div
        animate={gpsState === "locating" ? { rotate: 360 } : { rotate: 0 }}
        transition={gpsState === "locating"
          ? { repeat: Infinity, duration: 2, ease: "linear" }
          : { duration: 0.3 }}
      >
        <Icon size={56} color={color} strokeWidth={1.3}/>
      </motion.div>
      <span style={{
        fontFamily: "monospace",
        fontSize: 11,
        letterSpacing: "0.2em",
        color: color,
        marginTop: 10,
        opacity: 0.85,
      }}>
        {label}
      </span>
    </motion.div>
  );
}
