import NextAuth from 'next-auth';
import { authConfig } from '@/app/lib/auth';
 
// maybe upgrade next-auth to v5 once it's out of beta
// downgraded to v4 due to https://github.com/nextauthjs/next-auth/discussions/9385

export default NextAuth(authConfig);