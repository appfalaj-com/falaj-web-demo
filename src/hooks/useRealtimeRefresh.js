import { useEffect, useMemo, useRef } from "react";
import { FALAJ_REALTIME_REFRESH_EVENT } from "../services/realtimeEvents.js";

export default function useRealtimeRefresh(callback, tables = []) {
  const callbackRef = useRef(callback);
  const tablesKey = useMemo(
    () => [...tables].sort().join(","),
    [tables]
  );

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const allowedTables = new Set(tablesKey.split(",").filter(Boolean));
    let refreshTimer = null;

    function handleRealtimeRefresh(event) {
      const table = event.detail?.table;
      if (allowedTables.size > 0 && !allowedTables.has(table)) return;

      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        callbackRef.current?.(event.detail);
      }, 180);
    }

    window.addEventListener(
      FALAJ_REALTIME_REFRESH_EVENT,
      handleRealtimeRefresh
    );

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.removeEventListener(
        FALAJ_REALTIME_REFRESH_EVENT,
        handleRealtimeRefresh
      );
    };
  }, [tablesKey]);
}
