export type User = {
    id: string;
    name: string;
    email: string;
    password: string;
  };
  
  export type Page = {
    id: string;
    value: string;
    userId: string;
    title: string;
  }