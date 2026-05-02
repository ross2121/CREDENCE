import { Queue } from "bullmq";

export type QueueBundle = {
  creditScoring: Queue | undefined;
  analyticsRefresh: Queue | undefined;
};

export function createQueues(redisUrl?: string): QueueBundle {
  if (!redisUrl) {
    return {
      creditScoring: undefined,
      analyticsRefresh: undefined,
    };
  }

  const connection = { url: redisUrl };

  return {
    creditScoring: new Queue("credit-scoring", { connection }),
    analyticsRefresh: new Queue("analytics-refresh", { connection }),
  };
}

export async function queueStatus(queues: QueueBundle) {
  return {
    configured: Boolean(queues.creditScoring && queues.analyticsRefresh),
    creditScoringWaiting: queues.creditScoring
      ? await queues.creditScoring.getWaitingCount()
      : 0,
    analyticsRefreshWaiting: queues.analyticsRefresh
      ? await queues.analyticsRefresh.getWaitingCount()
      : 0,
  };
}
