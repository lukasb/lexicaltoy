import { createContext } from 'react';
import { Page } from '@/app/lib/definitions';

export const PagesContext = createContext<Page[]>([]);