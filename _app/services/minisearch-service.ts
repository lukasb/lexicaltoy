import MiniSearch from 'minisearch';
import { Page } from '@/lib/definitions';

class MiniSearchService {
  private static instance: MiniSearchService;
  private miniSearch: MiniSearch<Page>;
  private indexedRef: boolean = false;

  private constructor() {
    this.miniSearch = new MiniSearch<Page>({
      fields: ['title', 'value'],
      storeFields: ['title', 'value'],
    });
  }

  public static getInstance(): MiniSearchService {
    if (!MiniSearchService.instance) {
      MiniSearchService.instance = new MiniSearchService();
    }
    return MiniSearchService.instance;
  }

  public slurpPages(pages: Page[]): void {
    console.log("slurping pages into MiniSearch", pages.length, pages[0]?.title);
    try {
      this.miniSearch.addAll(pages);
      this.indexedRef = true;
    } catch (error) {
      console.error("Error slurping pages into MiniSearch", error);
    }
  }

  public discardPage(id: string): void {
    try {
      this.miniSearch.discard(id);
    } catch (error) {
      console.error("Error discarding page from MiniSearch", error);
    }
  }

  public replacePage(page: Page): void {
    try {
      this.miniSearch.replace(page);
    } catch (error) {
      console.error("Error replacing page in MiniSearch", error);
    }
  }

  public addPage(page: Page): void {
    try {
      this.miniSearch.add(page);
    } catch (error) {
      console.error("Error adding page to MiniSearch", error, page.title);
    }
  }

  public search(query: string) {
    return this.miniSearch.search(query, {
      prefix: true,
      boost: { title: 2 },
      combineWith: 'AND'
    });
  }

  public isIndexed(): boolean {
    return this.indexedRef;
  }
}

export const miniSearchService = MiniSearchService.getInstance(); 