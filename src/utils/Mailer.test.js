const nodemailer = require('nodemailer');
const Mailer = require('./Mailer');

jest.mock('nodemailer');

describe('Mailer', () => {
  it('create mailer with empty html', () => {
    nodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockReturnValue({ messageId: '1' }),
    });

    const payload = {
      to: 'john.doe@mail.com',
      subject: 'Email tester',
    };

    const mailer = new Mailer(payload);
    expect(mailer.html).toEqual('');
  });
});
