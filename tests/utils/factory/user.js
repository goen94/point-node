const faker = require('faker');
const { User } = require('@src/models').tenant;

async function create({ name, firstName, lastName, email, password, emailConfirmationCode, emailConfirmed } = {}) {
  const user = await User.create({
    name: name || faker.name.findName(),
    firstName: firstName || faker.name.firstName(),
    lastName: lastName || faker.name.lastName(),
    email: email || faker.internet.email(),
    password: password || faker.internet.password(),
    emailConfirmationCode: emailConfirmationCode || faker.datatype.string(),
    emailConfirmed: emailConfirmed || true,
  });

  return user;
}

module.exports = { create };
