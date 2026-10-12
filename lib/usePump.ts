"use client";

import { useState, useEffect, useCallback } from "react";

export interface PumpProfile {
  id: number;
  name: string;
  pump_name: string;
  owner_name?: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  logo_url?: string | null;
}

export function usePump() {
  const [pump, setPump] = useState<PumpProfile>({
    id: 1,
    name: "Nexeta Petrol",
    pump_name: "Nexeta Petrol",
    phone: "0300-1234567",
    city: "Lahore",
    address: "GT Road, Lahore, Pakistan",
    logo_url: null,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const refreshPump = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        const pumpId = data?.session?.pumpId || 1;
        const pRes = await fetch(`/api/pumps/${pumpId}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData?.pump) {
            setPump({
              id: pData.pump.id,
              name: pData.pump.name || pData.pump.pump_name || "Nexeta Petrol",
              pump_name: pData.pump.pump_name || pData.pump.name || "Nexeta Petrol",
              owner_name: pData.pump.owner_name,
              phone: pData.pump.phone || "0300-1234567",
              city: pData.pump.city || "Pakistan",
              address: pData.pump.address || `${pData.pump.city || "Main Highway"}, Pakistan`,
              logo_url: pData.pump.logo_url || null,
            });
            return;
          }
        }
        if (data?.session) {
          setPump((prev) => ({
            ...prev,
            id: pumpId,
            name: data.session.pumpName || prev.name,
            pump_name: data.session.pumpName || prev.pump_name,
          }));
        }
      }
    } catch (err) {
      console.error("usePump hook fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPump();
  }, [refreshPump]);

  return { pump, loading, refreshPump };
}
