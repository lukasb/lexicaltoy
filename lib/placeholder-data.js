const users = [
    {
      id: '410544b2-4001-4271-9855-fec4b6a6442a',
      name: 'User',
      email: 'user@nextmail.com',
      password: '123456'
    },
  ];
  
  const pages = [
    {
      id: '3958dc9e-712f-4377-85e9-fec4b6a6443d',
      value: `- `,
      userId: '410544b2-4001-4271-9855-fec4b6a6442a',
      title: 'My First Page',
      last_modified: new Date().toISOString()
    }
  ];
  
  module.exports = {
    users,
    pages,
  };