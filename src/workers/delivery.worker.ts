import "dotenv/config";
import { Worker } from "bullmq";
import { redisConnection } from "../queue/connection.js";

const worker = new Worker(
  "publish-delivery",
  async (job) => {
    console.log(`Processing delivery job ${job.id}`, job.data);
    // Worker publishing logic placeholder as defined in MVP spec
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error:`, err);
});

console.log("Delivery worker is running...");
