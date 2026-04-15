import { useEffect, useCallback, useRef } from "react";

const MEAL_REMINDER_TIMES = [
  { hour: 8, minute: 0, label: "breakfast" },
  { hour: 12, minute: 30, label: "lunch" },
  { hour: 18, minute: 30, label: "dinner" },
];
const WORKOUT_REMINDER_HOUR = 17; // 5 PM
const WORKOUT_REMINDER_MINUTE = 0;

const STORAGE_KEY = "fitflow-notification-prefs";

export interface NotificationPrefs {
  enabled: boolean;
  mealReminders: boolean;
  workoutReminders: boolean;
}

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { enabled: false, mealReminders: true, workoutReminders: true };
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function canNotify(): boolean {
  return "Notification" in window;
}

export async function requestPermission(): Promise<boolean> {
  if (!canNotify()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function showNotification(title: string, body: string) {
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: title, // prevent duplicates
    });
  } catch {
    // SW notification fallback for mobile
    navigator.serviceWorker?.ready?.then(reg => {
      reg.showNotification(title, { body, icon: "/icon-192.png", tag: title });
    }).catch(() => {});
  }
}

/**
 * Hook that schedules local notification reminders using setTimeout.
 * Runs on Dashboard mount.
 */
export function useNotificationReminders() {
  const timersRef = useRef<number[]>([]);

  const scheduleReminders = useCallback(() => {
    // Clear old timers
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];

    const prefs = getNotificationPrefs();
    if (!prefs.enabled || Notification.permission !== "granted") return;

    const now = new Date();

    // Schedule meal reminders
    if (prefs.mealReminders) {
      for (const { hour, minute, label } of MEAL_REMINDER_TIMES) {
        const target = new Date(now);
        target.setHours(hour, minute, 0, 0);
        let delay = target.getTime() - now.getTime();
        if (delay < 0) continue; // already passed today

        const timer = window.setTimeout(() => {
          showNotification(
            `Time for ${label}! 🍽️`,
            "Don't forget to log your meal in FitFlow."
          );
        }, delay);
        timersRef.current.push(timer);
      }
    }

    // Schedule workout reminder
    if (prefs.workoutReminders) {
      const target = new Date(now);
      target.setHours(WORKOUT_REMINDER_HOUR, WORKOUT_REMINDER_MINUTE, 0, 0);
      let delay = target.getTime() - now.getTime();
      if (delay > 0) {
        const timer = window.setTimeout(() => {
          showNotification(
            "Workout time! 💪",
            "Ready for today's workout? Open FitFlow to get started."
          );
        }, delay);
        timersRef.current.push(timer);
      }
    }
  }, []);

  useEffect(() => {
    scheduleReminders();
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, [scheduleReminders]);

  return { scheduleReminders };
}
