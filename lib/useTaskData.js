"use client";

/**
 * useTaskData — central state hook for all task queues.
 *
 * Manages:
 *   - queues list (BigQuery-sourced + CSV uploads)
 *   - task rows per queue (status, notes, archive state)
 *   - initial task counts (used for input→output reporting)
 *
 * All mutations (updateTask, archiveTask, etc.) record who made the
 * change and when, powering the Daily Summary view.
 */

import { useState, useCallback } from "react";
import { SEED_QUEUES } from "./seedData";

// Queue IDs that are populated from the BigQuery failed-bookings API
const BQ_QUEUE_IDS = ["uk", "uk_transfers", "de", "de_transfers"];

export function useTaskData() {
  const [queues, setQueues] = useState(SEED_QUEUES);

  const [taskData, setTaskData] = useState(() => {
    const d = {};
    SEED_QUEUES.forEach(q => { d[q.id] = q.initialData; });
    return d;
  });

  const [initialCounts, setInitialCounts] = useState(() => {
    const d = {};
    SEED_QUEUES.forEach(q => { d[q.id] = q.initialData.length; });
    return d;
  });

  // loadingQueues: set of queue IDs currently fetching from BigQuery
  const [loadingQueues, setLoadingQueues] = useState(new Set());

  // Composite key — a booking ref can have multiple distinct errors,
  // so we key on ref + error_code + error_type + booking_action to uniquely
  // identify each row.
  const rowKey = (r) =>
    [r.chips_reference, r.error_code, r.error_type, r.booking_action]
      .map(v => v ?? "")
      .join("|");

  // Merge incoming BQ rows with existing task state.
  // Rules:
  //   - New composite key → add as fresh pending task
  //   - Already touched (notes / non-pending status / archived) → keep agent's version
  //   - Untouched pending row → replace with latest BQ data (field values may have changed)
  const mergeRows = useCallback((existingRows, freshRows) => {
    const existingByKey = {};
    existingRows.forEach(t => { existingByKey[rowKey(t)] = t; });

    return freshRows.map(fresh => {
      const existing = existingByKey[rowKey(fresh)];
      if (!existing) return fresh; // brand new row

      const agentHasTouched =
        existing.status !== "pending" ||
        existing.notes   !== ""       ||
        existing.archived;

      if (agentHasTouched) {
        // Preserve everything the agent did; keep BQ source fields fresh
        return { ...fresh, ...existing, _id: existing._id };
      }
      // Untouched — take the fresh BQ copy but keep our _id
      return { ...fresh, _id: existing._id };
    });
  }, []);

  // Fetch all 4 workstream queues from BigQuery and merge with current state.
  // Safe to call repeatedly (every 30 min) — preserves agent work in progress.
  const loadFailedBookings = useCallback(async () => {
    setLoadingQueues(prev => new Set([...prev, ...BQ_QUEUE_IDS]));
    try {
      const res  = await fetch("/api/queues/failed-bookings");
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTaskData(prev => ({
        ...prev,
        uk:           mergeRows(prev.uk           ?? [], data.uk),
        uk_transfers: mergeRows(prev.uk_transfers ?? [], data.uk_transfers),
        de:           mergeRows(prev.de           ?? [], data.de),
        de_transfers: mergeRows(prev.de_transfers ?? [], data.de_transfers),
      }));

      setInitialCounts(prev => ({
        ...prev,
        uk:           data.uk.length,
        uk_transfers: data.uk_transfers.length,
        de:           data.de.length,
        de_transfers: data.de_transfers.length,
      }));
    } catch (err) {
      console.error("Failed to load BigQuery data:", err);
    } finally {
      setLoadingQueues(prev => {
        const next = new Set(prev);
        BQ_QUEUE_IDS.forEach(id => next.delete(id));
        return next;
      });
    }
  }, []);

  // Update a single task's fields. Automatically tracks who changed the
  // status and when — used by the Daily Summary.
  // If status is set to "completed" or "done", the task is immediately archived.
  const updateTask = useCallback((queueId, taskId, updates, user) => {
    setTaskData(prev => ({
      ...prev,
      [queueId]: prev[queueId].map(t => {
        if (t._id !== taskId) return t;
        const updated = { ...t, ...updates };
        if (updates.status && updates.status !== t.status) {
          updated.status_updated_at = new Date().toISOString();
          updated.status_updated_by = user?.name ?? "Unknown";
          // Auto-archive on completion and record who completed it
          if (updates.status === "completed" || updates.status === "done") {
            updated.archived     = true;
            updated.archived_at  = new Date().toISOString();
            updated.archived_by  = user?.name ?? "Unknown";
            updated.completed_by = updates.completed_by ?? user?.name ?? "Unknown";
            updated.completed_at = updates.completed_at ?? new Date().toISOString();
          }
        }
        return updated;
      }),
    }));
  }, []);

  // Archive a single task — removes it from the active queue view
  // but preserves it in the Archive tab.
  const archiveTask = useCallback((queueId, taskId, user) => {
    setTaskData(prev => ({
      ...prev,
      [queueId]: prev[queueId].map(t =>
        t._id === taskId
          ? { ...t, archived: true, archived_at: new Date().toISOString(), archived_by: user?.name ?? "Unknown" }
          : t
      ),
    }));
  }, []);

  // Restore an archived task back to the active queue.
  const restoreTask = useCallback((queueId, taskId) => {
    setTaskData(prev => ({
      ...prev,
      [queueId]: prev[queueId].map(t =>
        t._id === taskId
          ? { ...t, archived: false, archived_at: null, archived_by: null, completed_by: null, completed_at: null, status: "pending" }
          : t
      ),
    }));
  }, []);

  // Bulk archive — moves all completed tasks in a queue to the archive.
  const archiveAllCompleted = useCallback((queueId, user) => {
    setTaskData(prev => ({
      ...prev,
      [queueId]: prev[queueId].map(t =>
        t.status === "completed" && !t.archived
          ? { ...t, archived: true, archived_at: new Date().toISOString(), archived_by: user?.name ?? "Unknown" }
          : t
      ),
    }));
  }, []);

  // Add a new queue created via CSV upload.
  const addQueue = useCallback((newQueue) => {
    setQueues(prev => [...prev, newQueue]);
    setTaskData(prev => ({ ...prev, [newQueue.id]: newQueue.initialData }));
    setInitialCounts(prev => ({ ...prev, [newQueue.id]: newQueue.initialData.length }));
  }, []);

  // Import CSV rows into an existing queue.
  // Uses the same composite-key merge as BigQuery so re-uploading
  // the same CSV won't create duplicates — but new rows are appended.
  // displayCols is intentionally left unchanged — existing queues keep their
  // established column layout regardless of what the incoming CSV contains.
  const importToQueue = useCallback((queueId, csvRows) => {
    setTaskData(prev => {
      const existing = prev[queueId] ?? [];
      const merged   = mergeRows(existing, csvRows);
      // Rows in existing but not in csvRows are kept as-is (agent may have worked on them)
      const newKeys  = new Set(csvRows.map(rowKey));
      const kept     = existing.filter(t => !newKeys.has(rowKey(t)));
      return { ...prev, [queueId]: [...merged, ...kept] };
    });
    setInitialCounts(prev => ({
      ...prev,
      [queueId]: (prev[queueId] ?? 0) + csvRows.length,
    }));
  }, [mergeRows]);

  // Manually add a single task to a queue (from the "+ Add task" button).
  const addTask = useCallback((queueId, fields) => {
    const newTask = {
      _id:               `manual_${Date.now()}`,
      ...fields,
      created_at:        new Date().toISOString(),
      status:            "pending",
      assigned_to:       null,
      assigned_by:       null,
      assigned_at:       null,
      notes:             "",
      archived:          false,
      archived_at:       null,
      archived_by:       null,
      completed_by:      null,
      completed_at:      null,
      completion_outcome:null,
      status_updated_at: null,
      status_updated_by: null,
    };
    setTaskData(prev => ({
      ...prev,
      [queueId]: [newTask, ...(prev[queueId] ?? [])],
    }));
  }, []);

  // Add a manager-defined custom field to a queue and initialise it as null
  // on every existing task so the column renders consistently from day one.
  const addCustomField = useCallback((queueId, fieldDef) => {
    setQueues(prev => prev.map(q =>
      q.id !== queueId ? q : { ...q, customFields: [...(q.customFields ?? []), fieldDef] }
    ));
    setTaskData(prev => ({
      ...prev,
      [queueId]: (prev[queueId] ?? []).map(t => ({ ...t, [fieldDef.key]: t[fieldDef.key] ?? null })),
    }));
  }, []);

  return {
    queues,
    taskData,
    initialCounts,
    loadingQueues,
    updateTask,
    archiveTask,
    restoreTask,
    archiveAllCompleted,
    addQueue,
    importToQueue,
    addTask,
    addCustomField,
    loadFailedBookings,
  };
}
