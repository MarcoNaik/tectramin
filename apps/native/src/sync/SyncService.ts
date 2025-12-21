import { networkMonitor } from "./NetworkMonitor";
import { pushChanges } from "./SyncPush";
import { pullChanges, initialSync } from "./SyncPull";
import { getQueueCount } from "./SyncQueue";
import type { ConvexReactClient } from "convex/react";
import type { SyncStatus, SyncState } from "./types";

type SyncListener = (status: SyncStatus) => void;

class SyncServiceClass {
  private convex: ConvexReactClient | null = null;
  private userId: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private status: SyncStatus = {
    state: "idle",
    pendingCount: 0,
    lastSyncAt: null,
    error: null,
  };
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private networkUnsubscribe: (() => void) | null = null;

  async initialize(convex: ConvexReactClient, userId: string) {
    this.convex = convex;
    this.userId = userId;

    networkMonitor.start();
    this.networkUnsubscribe = networkMonitor.subscribe(
      this.handleNetworkChange.bind(this)
    );

    if (networkMonitor.getIsOnline()) {
      await this.performInitialSync();
    }

    this.startPeriodicSync();
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    networkMonitor.stop();
    this.convex = null;
    this.userId = null;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  async sync(): Promise<void> {
    if (!this.convex || !this.userId || !networkMonitor.getIsOnline()) {
      return;
    }

    if (this.status.state === "syncing") {
      return;
    }

    this.updateStatus({ state: "syncing", error: null });

    try {
      const pushResult = await pushChanges(this.convex);
      if (!pushResult.success) {
        this.updateStatus({
          state: "error",
          error: pushResult.errors.join(", "),
        });
        return;
      }

      const pullResult = await pullChanges(this.convex, this.userId);
      if (!pullResult.success) {
        this.updateStatus({ state: "error", error: pullResult.error ?? null });
        return;
      }

      const pendingCount = await getQueueCount();
      this.updateStatus({
        state: "idle",
        pendingCount,
        lastSyncAt: new Date(),
        error: null,
      });
    } catch (error) {
      this.updateStatus({
        state: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async performInitialSync(): Promise<void> {
    if (!this.convex || !this.userId) return;

    this.updateStatus({ state: "syncing" });

    const result = await initialSync(this.convex, this.userId);
    if (result.success) {
      this.updateStatus({ state: "idle", lastSyncAt: new Date() });
    } else {
      this.updateStatus({ state: "error", error: result.error ?? null });
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    if (isOnline) {
      this.sync();
    }
  }

  private startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      if (networkMonitor.getIsOnline()) {
        this.sync();
      }
    }, 30000);
  }

  private updateStatus(partial: Partial<SyncStatus>) {
    this.status = { ...this.status, ...partial };
    this.listeners.forEach((listener) => listener(this.status));
  }

  async updatePendingCount() {
    const count = await getQueueCount();
    this.updateStatus({ pendingCount: count });
  }
}

export const syncService = new SyncServiceClass();
