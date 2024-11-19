const users = [
  {
    id: '410544b2-4001-4271-9855-fec4b6a6442b',
    name: 'Test User',
    email: 'test@nextmail.com',
    password: '123456',
  },
];

const pages = [
  {
    id: '3958dc9e-712f-4377-85e9-fec4b6a6442b',
    value: `- `,
    userId: '410544b2-4001-4271-9855-fec4b6a6442b',
    title: 'TestPage1',
    isJournal: false,
  },
  {
    id: '3958dc9e-712f-4377-85e9-fec4b6a6442c',
    value: `- Hello, world!`,
    userId: '410544b2-4001-4271-9855-fec4b6a6442b',
    title: 'aTestPage2',
    isJournal: false,
  }
];

module.exports = {
  users,
  pages,
};