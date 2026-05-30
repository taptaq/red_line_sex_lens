import test from "node:test";
import assert from "node:assert/strict";

import { summarizeXhsAccountDiagnosis, summarizeXhsAccountDiagnosisWithSimilarFollowups } from "../src/xhs-account-diagnosis.js";
import { runXhsAccountDiagnosisSubscription } from "../src/xhs-account-diagnosis-subscriptions.js";

test("summarizeXhsAccountDiagnosis normalizes Redfox account and similar-account payloads", async () => {
  const result = await summarizeXhsAccountDiagnosis({
    redId: "26112666886",
    queryAccount: async () => ({
      items: [
        {
          nickname: "测试号",
          redId: "26112666886",
          fans: 12000,
          desc: "主页简介",
          totalWork: 127,
          liked: 217035,
          collected: 24745,
          noteCountThirty: 12,
          interactiveCountThirty: 133547,
          works: [
            {
              id: "work-1",
              title: "最近一篇内容",
              likedCount: 320,
              collectedCount: 90,
              workUrl: "https://www.xiaohongshu.com/example"
            }
          ]
        }
      ]
    }),
    querySimilar: async () => ({
      peerAccounts: [{ redId: "p1", nickname: "同阶号", fans: 10000, interactiveCountThirty: 3000 }],
      benchmarkAccounts: [{ redId: "b1", nickname: "标杆号", fans: 45000, interactiveCountThirty: 9000 }]
    })
  });

  assert.equal(result.account.nickname, "测试号");
  assert.equal(result.account.redId, "26112666886");
  assert.equal(result.account.metrics.fans, 12000);
  assert.equal(result.diagnosis.score > 0, true);
  assert.match(result.diagnosis.summary, /测试号|近30天|同阶/);
  assert.equal(result.similarAccounts.peer.length, 1);
  assert.equal(result.similarAccounts.benchmark.length, 1);
});

test("summarizeXhsAccountDiagnosis still works when similar-account lookup fails and falls back to account payload similarAccounts", async () => {
  const result = await summarizeXhsAccountDiagnosis({
    redId: "26112666886",
    queryAccount: async () => {
      return {
        items: [
          {
            nickname: "回退测试号",
            redId: "26112666886",
            fans: 4584,
            desc: "回退简介",
            totalWork: 145,
            liked: 239089,
            collected: 26136,
            noteCountThirty: 54,
            interactiveCountThirty: 18280,
            works: [],
            similarAccounts: [
              {
                redId: "peer-embedded-1",
                nickname: "内嵌相似号",
                fans: 3811,
                interactiveCountThirty: 329546
              }
            ]
          }
        ]
      };
    },
    querySimilar: async () => {
      throw new Error("相似账号接口暂时失败");
    }
  });

  assert.equal(result.account.nickname, "回退测试号");
  assert.equal(result.account.metrics.fans, 4584);
  assert.equal(result.similarAccounts.peer.length, 1);
  assert.equal(result.similarAccounts.peer[0].nickname, "内嵌相似号");
});

test("summarizeXhsAccountDiagnosisWithSimilarFollowups automatically analyzes 2-3 similar accounts", async () => {
  const byId = {
    "main": {
      items: [
        {
          nickname: "主账号",
          redId: "main",
          fans: 12000,
          desc: "主账号简介",
          totalWork: 40,
          liked: 100000,
          collected: 20000,
          noteCountThirty: 12,
          interactiveCountThirty: 25000,
          works: []
        }
      ]
    },
    "peer-1": {
      items: [
        {
          nickname: "相似账号1",
          redId: "peer-1",
          fans: 9000,
          desc: "相似1",
          totalWork: 18,
          liked: 60000,
          collected: 8000,
          noteCountThirty: 8,
          interactiveCountThirty: 12000,
          works: []
        }
      ]
    },
    "peer-2": {
      items: [
        {
          nickname: "相似账号2",
          redId: "peer-2",
          fans: 8000,
          desc: "相似2",
          totalWork: 12,
          liked: 30000,
          collected: 5000,
          noteCountThirty: 7,
          interactiveCountThirty: 9000,
          works: []
        }
      ]
    }
  };

  const result = await summarizeXhsAccountDiagnosisWithSimilarFollowups({
    redId: "main",
    queryAccount: async (id) => byId[id],
    querySimilar: async (id) =>
      id === "main"
        ? {
            peerAccounts: [
              { redId: "peer-1", nickname: "相似账号1", fans: 9000, interactiveCountThirty: 12000 },
              { redId: "peer-2", nickname: "相似账号2", fans: 8000, interactiveCountThirty: 9000 }
            ],
            benchmarkAccounts: []
          }
        : { peerAccounts: [], benchmarkAccounts: [] }
  });

  assert.equal(result.account.nickname, "主账号");
  assert.equal(Array.isArray(result.similarFollowups), true);
  assert.equal(result.similarFollowups.length, 2);
  assert.equal(result.similarFollowups[0].account.nickname, "相似账号1");
  assert.equal(result.similarFollowups[1].account.nickname, "相似账号2");
});

test("runXhsAccountDiagnosisSubscription schedules a retry when sync fails", async () => {
  const currentStore = {
    items: [
      {
        id: "sub-1",
        redId: "855409667",
        nickname: "六层楼",
        status: "scheduled",
        scheduledAt: "2026-05-29T11:51:44.407Z",
        createdAt: "2026-05-29T11:21:44.407Z",
        updatedAt: "2026-05-29T11:21:44.407Z",
        lastAttemptAt: "",
        lastCompletedAt: "",
        lastError: "",
        retryCount: 0,
        nextRetryAt: ""
      }
    ]
  };

  let savedStore = null;
  const result = await runXhsAccountDiagnosisSubscription(
    currentStore.items[0],
    {
      syncNotes: async () => {
        const error = new Error("补采请求网络异常：fetch failed");
        error.cause = new Error("getaddrinfo ENOTFOUND redfox.hk");
        throw error;
      },
      diagnose: async () => {
        throw new Error("should not reach diagnose");
      },
      loadStore: async () => currentStore,
      saveStore: async (value) => {
        savedStore = value;
        currentStore.items = value.items;
        return value;
      },
      saveDiagnosis: async () => ({}),
      loadDiagnosis: async () => ({ result: null }),
      now: Date.parse("2026-05-29T11:51:44.407Z")
    }
  );

  assert.equal(result.status, "scheduled");
  assert.equal(result.retryCount, 1);
  assert.match(result.lastError, /fetch failed/);
  assert.match(result.lastError, /ENOTFOUND redfox\.hk/);
  assert.equal(Boolean(result.nextRetryAt), true);
  assert.equal(Array.isArray(savedStore?.items), true);
});
