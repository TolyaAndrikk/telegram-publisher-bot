import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";

export const publishQueue = new Queue("publish-delivery", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 4,
    backoff: { type: "exponential", delay: 5000 },
  },
});
