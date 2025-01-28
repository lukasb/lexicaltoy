import { splitMarkdownByNodes } from "../markdown/markdown-helpers";
import { 
  nodeToString,
  nodeValueForFormula,
  getListItemContentsFromMarkdown,
} from "../formula/formula-helpers";
import { Page } from "../definitions";
import { NodeElementMarkdown } from "../formula/formula-definitions";
import { 
  BLOCK_ID_REGEX,
  BLOCK_REFERENCE_REGEX,
} from "../blockref";
import { stripBrackets } from "../transform-helpers";
import { getLastSixWeeksJournalPages } from "../journal-helpers";

function getPageContext(page: Page): string {
  return "## " + page.title + "\n" + page.value + "\n## END OF PAGE CONTENTS\n";
}

function getBlockContext(page: Page, blockId: string): string {
  const nodes = splitMarkdownByNodes(page.value, page.title);

  function findBlock(nodes: NodeElementMarkdown[], blockId: string): NodeElementMarkdown | null {
    for (const node of nodes) {
      const match = node.baseNode.nodeMarkdown.match(BLOCK_ID_REGEX);
      if (match && match[1] === blockId) return node;
      const result = findBlock(node.children, blockId);
      if (result) return result;
    }
    return null;
  }

  const blockNode = findBlock(nodes, blockId);
  if (!blockNode) return "";
  const blockNodeMarkdown = nodeToString(blockNode);
  const blockNodeContents = getListItemContentsFromMarkdown(blockNodeMarkdown);
  const blockNodeValue = nodeValueForFormula(blockNodeContents);
  return blockNodeValue;
}

export function getPagesContext(pageSpecs: string[], pages: Page[]): string[] {
  let pagesContext: string[] = [];

  function addPages(pageSpec: string) {
    const pageTitle = stripBrackets(pageSpec);

    if (pageTitle.endsWith("/")) {
      if (pageTitle === "journals/") {
        const journalPages = getLastSixWeeksJournalPages(pages);
        let journalPagesContext: string = "";
        journalPages.forEach(page => journalPagesContext += getPageContext(page));
        pagesContext.push(journalPagesContext);
      } else {
        pages
          .filter(p => p.title.startsWith(pageTitle.slice(0, -1)))
          .forEach(page => pagesContext.push(getPageContext(page)));
      }
    } else if (BLOCK_REFERENCE_REGEX.test(pageTitle)) {
      const match = pageTitle.match(BLOCK_REFERENCE_REGEX);
      const cleanPageTitle = pageTitle.replace(BLOCK_REFERENCE_REGEX, "");
      const page = pages.find(p => p.title === cleanPageTitle);
      if (match && page) {
        const blockContext = getBlockContext(page, match[1]);
        if (blockContext) pagesContext.push(blockContext);
      }
    } else {
      const page = pages.find(p => p.title === pageTitle);
      if (page) pagesContext.push(getPageContext(page));
    }
  }

  for (const pageSpec of pageSpecs) {
    addPages(pageSpec);
  }

  return pagesContext;
}
