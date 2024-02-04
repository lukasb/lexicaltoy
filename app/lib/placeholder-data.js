const users = [
    {
      id: '410544b2-4001-4271-9855-fec4b6a6442a',
      name: 'User',
      email: 'user@nextmail.com',
      password: '123456',
    },
  ];
  
  const pages = [
    {
      id: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
      value: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Hello, world!","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
      userId: '410544b2-4001-4271-9855-fec4b6a6442a',
      title: 'My First Page'
    }
  ];
  
  module.exports = {
    users,
    pages,
  };