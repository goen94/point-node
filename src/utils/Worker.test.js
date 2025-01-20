const Queue = require('bull');
const logger = require('@src/config/logger');
const Worker = require('./Worker');

describe('Mailer', () => {
  it('create mailer with empty html', () => {
    const exampleError = new Error('example error');
    const queueProcessSpy = jest.spyOn(Queue.prototype, 'process').mockImplementation(() => {
      throw exampleError;
    });
    const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    const payload = {
      title: 'Example worker',
      job: () => {},
    };

    const worker = new Worker(payload);
    expect(worker).toBeDefined();
    worker.call();
    expect(queueProcessSpy).toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalledWith(exampleError);
  });
});
