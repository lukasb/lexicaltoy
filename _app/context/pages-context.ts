import { createContext } from 'react';
import { Page } from '@/lib/definitions';

export const PagesContext = createContext<Page[]>([]);