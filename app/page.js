"use client";

/**
 * app/page.js — root page of the GSD Call Centre Hub.
 *
 * Auth: mock user picker (swap for Google OAuth when credentials are ready).
 * Data: 4 BigQuery workstream queues (UK, UK Transfers, DE, DE Transfers).
 */

import { useState } from "react";

import { useTaskData }       from "@/lib/useTaskData";

import LoginScreen      from "@/components/auth/LoginScreen";
import Navbar           from "@/components/layout/Navbar";
import Sidebar          from "@/components/layout/Sidebar";
import Dashboard        from "@/components/dashboard/Dashboard";
import DailySummary     from "@/components/summary/DailySummary";
import QueueView        from "@/components/queue/QueueView";
import UploadPage       from "@/components/upload/UploadPage";
import GlobalArchiveView from "@/components/archive/GlobalArchiveView";

export default function Page() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");

  const {
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
  } = useTaskData();

  // ── Auth ──────────────────────────────────────────────────────────────────

  // Owner and Manager both get manager-level access
  const isManager = (u) => ["manager", "owner"].includes((u?.role ?? "").toLowerCase());

  const handleLogin = (u) => {
    setUser(u);
    setPage(isManager(u) ? "dashboard" : (queues[0]?.id ?? "dashboard"));
  };

  const handleLogout = () => {
    setUser(null);
    setPage("dashboard");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const currentQueue = queues.find(q => q.id === page);
  const defaultPage  = isManager(user) ? "dashboard" : (queues[0]?.id ?? "dashboard");

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <Navbar user={user} onLogout={handleLogout} queues={queues} taskData={taskData} onPage={setPage} />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          queues={queues}
          taskData={taskData}
          page={page}
          onPage={setPage}
          user={user}
          loadingQueues={loadingQueues}
        />

        <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-white">

          {page === "dashboard" && isManager(user) && (
            <Dashboard
              queues={queues}
              taskData={taskData}
              initialCounts={initialCounts}
              onPage={setPage}
            />
          )}

          {page === "daily_summary" && isManager(user) && (
            <DailySummary queues={queues} taskData={taskData} />
          )}

          {page === "upload" && isManager(user) && (
            <UploadPage
              queues={queues}
              onAddQueue={addQueue}
              onImportToQueue={importToQueue}
              onAddTask={addTask}
              onBack={() => setPage(defaultPage)}
            />
          )}

          {page === "archive" && (
            <GlobalArchiveView
              queues={queues}
              taskData={taskData}
              onRestore={(queueId, taskId) => restoreTask(queueId, taskId)}
            />
          )}

          {currentQueue && (
            <QueueView
              queue={currentQueue}
              taskData={taskData}
              initialCount={initialCounts[currentQueue.id] ?? 0}
              onUpdateTask={updateTask}
              onArchiveTask={archiveTask}
              onRestoreTask={restoreTask}
              onAddTask={(fields) => addTask(currentQueue.id, fields)}
              archiveAllCompleted={archiveAllCompleted}
              user={user}
              isLoading={loadingQueues.has(currentQueue.id)}
            />
          )}

        </main>
      </div>
    </div>
  );
}
