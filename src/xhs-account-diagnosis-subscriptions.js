import { loadXhsAccountDiagnosis, loadXhsAccountDiagnosisSubscriptions, saveXhsAccountDiagnosis, saveXhsAccountDiagnosisSubscriptions } from "./data-store.js";
import { requestRedfoxSyncNotes, summarizeXhsAccountDiagnosis } from "./xhs-account-diagnosis.js";
import { saveXhsAccountDiagnosisReportArtifacts } from "./xhs-account-diagnosis-report.js";

const RETRY_DELAY_MS = 30 * 60 * 1000;
const RETRY_BACKOFF_MS = 5 * 60 * 1000;
const MAX_RETRY_COUNT = 2;

function normalizeString(value = "") {
  return String(value || "").trim();
}

function buildSubscriptionId(redId = "", scheduledAt = "") {
  return `xhs-diagnosis-${normalizeString(redId)}-${normalizeString(scheduledAt)}`;
}

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

export function createXhsAccountDiagnosisSubscriptionRecord({ redId = "", nickname = "", now = Date.now() } = {}) {
  const scheduledAt = new Date(Number(now) + RETRY_DELAY_MS).toISOString();
  return {
    id: buildSubscriptionId(redId, scheduledAt),
    redId: normalizeString(redId),
    nickname: normalizeString(nickname),
    status: "scheduled",
    scheduledAt,
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
    lastAttemptAt: "",
    lastCompletedAt: "",
    lastError: "",
    retryCount: 0,
    nextRetryAt: ""
  };
}

export async function saveScheduledXhsAccountDiagnosisSubscription(
  { redId = "", nickname = "", now = Date.now() } = {},
  { loadStore = loadXhsAccountDiagnosisSubscriptions, saveStore = saveXhsAccountDiagnosisSubscriptions } = {}
) {
  const normalizedRedId = normalizeString(redId);

  if (!normalizedRedId) {
    throw new Error("请先提供需要订阅的小红书号。");
  }

  const store = await loadStore();
  const record = createXhsAccountDiagnosisSubscriptionRecord({
    redId: normalizedRedId,
    nickname,
    now
  });
  const items = (Array.isArray(store?.items) ? store.items : []).filter((item) => normalizeString(item?.redId) !== normalizedRedId);
  items.push(record);

  await saveStore({ items });
  return record;
}

function updateStoreItem(items = [], nextItem = {}) {
  return (Array.isArray(items) ? items : []).map((item) =>
    normalizeString(item?.id) === normalizeString(nextItem?.id) ? { ...item, ...nextItem } : item
  );
}

export async function runXhsAccountDiagnosisSubscription(
  subscription = {},
  {
    syncNotes = requestRedfoxSyncNotes,
    diagnose = summarizeXhsAccountDiagnosis,
    loadStore = loadXhsAccountDiagnosisSubscriptions,
    saveStore = saveXhsAccountDiagnosisSubscriptions,
    saveDiagnosis = saveXhsAccountDiagnosis,
    saveReportArtifacts = saveXhsAccountDiagnosisReportArtifacts,
    loadDiagnosis = loadXhsAccountDiagnosis,
    now = Date.now()
  } = {}
) {
  const store = await loadStore();
  const items = Array.isArray(store?.items) ? store.items : [];
  const current = items.find((item) => normalizeString(item?.id) === normalizeString(subscription?.id)) || subscription;

  const running = {
    ...current,
    status: "running",
    updatedAt: nowIso(now),
    lastAttemptAt: nowIso(now),
    lastError: "",
    nextRetryAt: ""
  };
  await saveStore({ items: updateStoreItem(items, running) });

  try {
    await syncNotes(normalizeString(running.redId), normalizeString(running.nickname));
    const result = await diagnose({ redId: running.redId });
    const generatedAt = nowIso(now);
    await saveDiagnosis({
      result,
      redId: running.redId,
      generatedAt
    });
    await saveReportArtifacts(result, { generatedAt });
    const completed = {
      ...running,
      status: "completed",
      updatedAt: generatedAt,
      lastCompletedAt: generatedAt,
      lastError: ""
    };
    await saveStore({ items: updateStoreItem((await loadStore()).items, completed) });
    return completed;
  } catch (error) {
    const previousDiagnosis = await loadDiagnosis();
    const nextRetryCount = Number(current?.retryCount || 0) + 1;
    const shouldRetry = nextRetryCount <= MAX_RETRY_COUNT;
    const failed = {
      ...running,
      status: shouldRetry ? "scheduled" : "failed",
      updatedAt: nowIso(now),
      lastError: normalizeString(
        error?.cause?.message
          ? `${error?.message || "自动重查失败"} | cause: ${error.cause.message}`
          : error?.message || "自动重查失败"
      ),
      retryCount: nextRetryCount,
      nextRetryAt: shouldRetry ? nowIso(Number(now) + RETRY_BACKOFF_MS) : ""
    };
    await saveStore({ items: updateStoreItem((await loadStore()).items, failed) });
    return {
      ...failed,
      preservedDiagnosis: previousDiagnosis?.result || null
    };
  }
}

export function computeSubscriptionDelayMs(subscription = {}, now = Date.now()) {
  const targetAt = Date.parse(subscription?.nextRetryAt || subscription?.scheduledAt || "");
  if (!Number.isFinite(targetAt)) {
    return 0;
  }
  return Math.max(0, targetAt - Number(now));
}

export function createXhsAccountDiagnosisSubscriptionScheduler({
  runSubscription = runXhsAccountDiagnosisSubscription,
  loadStore = loadXhsAccountDiagnosisSubscriptions,
  saveStore = saveXhsAccountDiagnosisSubscriptions,
  now = () => Date.now(),
  setTimer = setTimeout,
  clearTimer = clearTimeout
} = {}) {
  const timers = new Map();

  function clearScheduledTimer(subscriptionId = "") {
    const normalizedId = normalizeString(subscriptionId);
    const timer = timers.get(normalizedId);
    if (timer) {
      clearTimer(timer);
      timers.delete(normalizedId);
    }
  }

  async function execute(subscription = {}) {
    clearScheduledTimer(subscription.id);
    await runSubscription(subscription);
  }

  function schedule(subscription = {}) {
    const normalizedId = normalizeString(subscription?.id);
    if (!normalizedId) {
      return;
    }
    clearScheduledTimer(normalizedId);
    const delay = computeSubscriptionDelayMs(subscription, now());
    const timer = setTimer(() => {
      execute(subscription).catch(() => {});
    }, delay);
    if (timer && typeof timer.unref === "function") {
      timer.unref();
    }
    timers.set(normalizedId, timer);
  }

  async function restore() {
    const store = await loadStore();
    for (const item of Array.isArray(store?.items) ? store.items : []) {
      if (item?.status === "scheduled" || item?.status === "running") {
        schedule(item);
      }
    }
  }

  async function subscribe(params = {}) {
    const record = await saveScheduledXhsAccountDiagnosisSubscription(params, { loadStore, saveStore });
    schedule(record);
    return record;
  }

  return {
    restore,
    schedule,
    subscribe,
    clearScheduledTimer
  };
}
