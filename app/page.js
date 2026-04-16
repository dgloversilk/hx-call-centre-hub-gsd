"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

import { useTaskData }  from "@/lib/useTaskData";
import { isManager }    from "@/lib/auth/roles";

import Navbar              from "@/components/layout/Navbar";
import Sidebar             from "@/components/layout/Sidebar";
import Dashboard           from "@/components/dashboard/Dashboard";
import DailySummary        from "@/components/summary/DailySummary";
import QueueView           from "@/components/queue/QueueView";
import UploadPage          from "@/components/upload/UploadPage";
import GlobalArchiveView   from "@/components/archive/GlobalArchiveView";
import MyTasks             from "@/components/my-tasks/MyTasks";
import QueuePriority       from "@/components/settings/QueuePriority";
import TeamSettings        from "@/components/settings/TeamSettings";
import KnowledgeBase       from "@/components/knowledge/KnowledgeBase";
import KnowledgeAssistant  from "@/components/knowledge/KnowledgeAssistant";

export default function Page() {
  const { data: session, status } = useSession();
  const user = session?.user ?? null;
  const router = useRouter();

  const [page, setPage] = useState("my_tasks");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") setPage(isManager(user) ? "dashboard" : "my_tasks");
  }, [status]);

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
    addCustomField,
    reorderQueue,
    moveQueue,
  } = useTaskData();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F1F5F9" }}>
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  const currentQueue = queues.find(q => q.id === page);
  const defaultPage  = isManager(user) ? "dashboard" : (queues[0]?.id ?? "dashboard");

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#F1F5F9" }}>
      <Navbar user={user} onLogout={() => signOut({ callbackUrl: "/login" })} queues={queues} taskData={taskData} onPage={setPage} />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          queues={queues}
          taskData={taskData}
          page={page}
          onPage={setPage}
          user={user}
          loadingQueues={loadingQueues}
          onReorderQueue={reorderQueue}
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
              taskData={taskData}
              onAddQueue={addQueue}
              onImportToQueue={importToQueue}
              onAddTask={addTask}
              onBack={() => setPage(defaultPage)}
            />
          )}

          {page === "my_tasks" && (
            <div className="flex-1 min-h-0 flex flex-col p-6 overflow-hidden">
              <MyTasks
                queues={queues}
                taskData={taskData}
                user={user}
                onUpdateTask={updateTask}
                onNavigateToQueue={setPage}
              />
            </div>
          )}

          {page === "queue_priority" && isManager(user) && (
            <div className="flex-1 overflow-y-auto p-6">
              <QueuePriority queues={queues} taskData={taskData} onReorder={reorderQueue} onMove={moveQueue} />
            </div>
          )}

          {page === "team" && isManager(user) && (
            <TeamSettings currentUser={user} />
          )}

          {page === "archive" && (
            <GlobalArchiveView
              queues={queues}
              taskData={taskData}
              onRestore={(queueId, taskId) => restoreTask(queueId, taskId)}
            />
          )}

          {page === "knowledge" && (
            <KnowledgeBase user={user} />
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
              onAddCustomField={(fieldDef) => addCustomField(currentQueue.id, fieldDef)}
              archiveAllCompleted={archiveAllCompleted}
              user={user}
              isLoading={loadingQueues.has(currentQueue.id)}
            />
          )}

        </main>
      </div>

      {/* Floating AI assistant — available on all pages */}
      <KnowledgeAssistant />
    </div>
  );
}
