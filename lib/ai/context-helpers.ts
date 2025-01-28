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
import { DocumentContent, CustomSource, TextSource } from "./ai-context";

function getPageContext(page: Page, context?: string): DocumentContent {
  const nodes = splitMarkdownByNodes(page.value, page.title);
  const customSource: CustomSource = {
    type: "content",
    content: nodes.map(node => ({ type: "text", text: nodeToString(node) })),
  };
  const doc: DocumentContent = {
    type: "document",
    title: page.title,
    citations: { enabled: true },
    source: customSource,
  };
  if (context) {
    doc.context = context;
  }
  return doc;
}

function getBlockContext(page: Page, blockId: string): DocumentContent | undefined {
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
  if (!blockNode) return undefined;
  const blockNodeMarkdown = nodeToString(blockNode);
  const blockNodeContents = getListItemContentsFromMarkdown(blockNodeMarkdown);
  const blockNodeValue = nodeValueForFormula(blockNodeContents);
  
  const textSource: TextSource = {
    type: "text",
    media_type: "text/markdown",
    data: blockNodeValue,
  };
  return {
    type: "document",
    title: blockId,
    citations: { enabled: true },
    source: textSource,
    context: "This is the content of the block with id " + blockId + " in the page " + page.title + ".",
  };
}

export function getNodesMarkdownContext(nodes: NodeElementMarkdown[]): DocumentContent[] {
  let docs: DocumentContent[] = [];
  for (const node of nodes) {
    const nodeMarkdown = nodeToString(node);
    const nodeMarkdownContents = getListItemContentsFromMarkdown(nodeMarkdown);
    const nodeMarkdownValue = nodeValueForFormula(nodeMarkdownContents);
    const textSource: TextSource = {
      type: "text",
      media_type: "text/markdown",
      data: nodeMarkdownValue,
    };
    docs.push({
      type: "document",
      title: node.baseNode.pageName,
      citations: { enabled: true },
      source: textSource,
      context: "This is the content of a specific node in the page " + node.baseNode.pageName + ".",
    });
  }
  return docs;
}

export function getPagesContext(pageSpecs: string[], pages: Page[]): DocumentContent[] {
  let pagesContext: DocumentContent[] = [];

  function addPages(pageSpec: string) {
    const pageTitle = stripBrackets(pageSpec);

    if (pageTitle.endsWith("/")) {
      if (pageTitle === "journals/") {
        const journalPages = getLastSixWeeksJournalPages(pages);
        let journalPagesContext: DocumentContent[] = [];
        journalPages.forEach(page => journalPagesContext.push(getPageContext(page, "This is one of the user's daily journal pages.")));
        pagesContext.push(...journalPagesContext);
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
