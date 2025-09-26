type Job = () => Promise<void>;

export class JobExecutor {
  private queue: Array<Job> = [];
  private isProcessing = false;

  private async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      await this.queue[0]();
      this.queue.shift();
    }

    this.isProcessing = false;
  }

  async run(job: Job) {
    return new Promise<void>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await job();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      void this.processQueue();
    });
  }
}
