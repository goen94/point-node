const Queue = require('bull');
const config = require('@src/config/config');
const logger = require('@src/config/logger');

class Worker {
  constructor({ title, job, options = {} }) {
    this.title = title;
    this.job = job;
    this.options = options;
  }

  call() {
    try {
      const newWorker = createWorker(this.title);
      const workerOptions = getWorkerOptions(this.options);

      newWorker.add(null, workerOptions);
      newWorker.process(() => this.job());

      return newWorker;
    } catch (error) {
      logger.error(error);
    }
  }
}

// private

function createWorker(title) {
  return new Queue(title, {
    redis: {
      host: config.redis.host,
      port: config.redis.port,
    },
  });
}

function getWorkerOptions(options) {
  return {
    attempts: 5,
    ...options,
  };
}

module.exports = Worker;
