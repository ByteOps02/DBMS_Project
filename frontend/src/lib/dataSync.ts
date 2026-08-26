import { useEffect, useRef } from "react";

export type SyncTopic = "visits" | "visitors" | "hosts" | "stats" | "all";

class DataSyncBus extends EventTarget {
  private channel: BroadcastChannel | null = null;

  constructor() {
    super();
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel("vms_data_sync_channel");
        this.channel.onmessage = (event: MessageEvent<{ topic: SyncTopic }>) => {
          if (event.data?.topic) {
            this.dispatchEvent(new CustomEvent("sync", { detail: event.data.topic }));
          }
        };
      } catch {
        this.channel = null;
      }
    }
  }

  public notify(topic: SyncTopic = "all") {
    // 1. Dispatch intra-window event
    this.dispatchEvent(new CustomEvent("sync", { detail: topic }));

    // 2. Broadcast across tabs/windows
    try {
      this.channel?.postMessage({ topic });
    } catch {
      // Ignore broadcast errors
    }
  }

  public subscribe(topics: SyncTopic[], callback: (topic: SyncTopic) => void) {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SyncTopic>).detail;
      if (topics.includes("all") || topics.includes(detail) || detail === "all") {
        callback(detail);
      }
    };

    this.addEventListener("sync", handler);
    return () => {
      this.removeEventListener("sync", handler);
    };
  }
}

export const dataSync = new DataSyncBus();

/**
 * React hook to subscribe component to real-time data sync events
 */
export function useDataSync(topics: SyncTopic[], onSync: (topic: SyncTopic) => void) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    const unsubscribe = dataSync.subscribe(topics, (topic) => {
      onSyncRef.current(topic);
    });

    // Also trigger on window focus and visibility change for seamless tab returns
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        onSyncRef.current("all");
      }
    };

    const handleFocus = () => {
      onSyncRef.current("all");
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [topics.join(",")]);
}
