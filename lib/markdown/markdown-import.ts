/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$findMatchingParent} from '@lexical/utils';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
} from 'lexical';

export const PUNCTUATION_OR_SPACE = /[!-/:-@[-`{-~\s]/;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ListType} from '@lexical/list';
import type {HeadingTagType} from '@lexical/rich-text';

import {$createCodeNode, $isCodeNode, CodeNode} from '@lexical/code';
import {$createLinkNode, $isLinkNode, LinkNode} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode,
} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createTextNode,
  $isTextNode,
  ElementNode,
  Klass,
  LexicalNode,
  TextFormatType,
  TextNode,
} from 'lexical';

export type Transformer =
  | ElementTransformer
  | TextFormatTransformer
  | TextMatchTransformer;

export type ElementTransformer = {
  dependencies: Array<Klass<LexicalNode>>;
  export: (
    node: LexicalNode,
    // eslint-disable-next-line no-shadow
    traverseChildren: (node: ElementNode) => string,
  ) => string | null;
  regExp: RegExp;
  replace: (
    parentNode: ElementNode,
    children: Array<LexicalNode>,
    match: Array<string>,
    isImport: boolean,
  ) => void;
  type: 'element';
};

export type TextFormatTransformer = Readonly<{
  format: ReadonlyArray<TextFormatType>;
  tag: string;
  intraword?: boolean;
  type: 'text-format';
}>;

export type TextMatchTransformer = Readonly<{
  dependencies: Array<Klass<LexicalNode>>;
  export: (
    node: LexicalNode,
    // eslint-disable-next-line no-shadow
    exportChildren: (node: ElementNode) => string,
    // eslint-disable-next-line no-shadow
    exportFormat: (node: TextNode, textContent: string) => string,
  ) => string | null;
  importRegExp: RegExp;
  regExp: RegExp;
  replace: (node: TextNode, match: RegExpMatchArray) => void;
  trigger: string;
  type: 'text-match';
}>;

const createBlockNode = (
  createNode: (match: Array<string>) => ElementNode,
): ElementTransformer['replace'] => {
  return (parentNode, children, match) => {
    const node = createNode(match);
    node.append(...children);
    parentNode.replace(node);
    node.select(0, 0);
  };
};

// Amount of spaces that define indentation level
// TODO: should be an option
const LIST_INDENT_SIZE = 4;

function getIndent(whitespaces: string): number {
  const tabs = whitespaces.match(/\t/g);
  const spaces = whitespaces.match(/ /g);

  let indent = 0;

  if (tabs) {
    indent += tabs.length;
  }

  if (spaces) {
    indent += Math.floor(spaces.length / LIST_INDENT_SIZE);
  }

  return indent;
}

const listReplace = (listType: ListType): ElementTransformer['replace'] => {
  return (parentNode, children, match) => {
    const previousNode = parentNode.getPreviousSibling();
    const nextNode = parentNode.getNextSibling();
    const listItem = $createListItemNode(
      listType === 'check' ? match[3] === 'x' : undefined,
    );
    if ($isListNode(nextNode) && nextNode.getListType() === listType) {
      const firstChild = nextNode.getFirstChild();
      if (firstChild !== null) {
        firstChild.insertBefore(listItem);
      } else {
        // should never happen, but let's handle gracefully, just in case.
        nextNode.append(listItem);
      }
      parentNode.remove();
    } else if (
      $isListNode(previousNode) &&
      previousNode.getListType() === listType
    ) {
      previousNode.append(listItem);
      parentNode.remove();
    } else {
      const list = $createListNode(
        listType,
        listType === 'number' ? Number(match[2]) : undefined,
      );
      list.append(listItem);
      parentNode.replace(list);
    }
    listItem.append(...children);
    // TODO commenting this out might have unintended consequences, but it did solve a focus stealing bug - Lukas
    //listItem.select(0, 0);
    const indent = getIndent(match[1]);
    if (indent) {
      listItem.setIndent(indent);
    }
  };
};

const listExport = (
  listNode: ListNode,
  exportChildren: (node: ElementNode) => string,
  depth: number,
): string => {
  const output = [];
  const children = listNode.getChildren();
  let index = 0;
  for (const listItemNode of children) {
    if ($isListItemNode(listItemNode)) {
      if (listItemNode.getChildrenSize() === 1) {
        const firstChild = listItemNode.getFirstChild();
        if ($isListNode(firstChild)) {
          output.push(listExport(firstChild, exportChildren, depth + 1));
          continue;
        }
      }
      const indent = ' '.repeat(depth * LIST_INDENT_SIZE);
      const listType = listNode.getListType();
      const prefix =
        listType === 'number'
          ? `${listNode.getStart() + index}. `
          : listType === 'check'
          ? `- [${listItemNode.getChecked() ? 'x' : ' '}] `
          : '- ';
      output.push(indent + prefix + exportChildren(listItemNode));
      index++;
    }
  }

  return output.join('\n');
};

export const HEADING: ElementTransformer = {
  dependencies: [HeadingNode],
  export: (node, exportChildren) => {
    if (!$isHeadingNode(node)) {
      return null;
    }
    const level = Number(node.getTag().slice(1));
    return '#'.repeat(level) + ' ' + exportChildren(node);
  },
  regExp: /^(#{1,6})\s/,
  replace: createBlockNode((match) => {
    const tag = ('h' + match[1].length) as HeadingTagType;
    return $createHeadingNode(tag);
  }),
  type: 'element',
};

export const QUOTE: ElementTransformer = {
  dependencies: [QuoteNode],
  export: (node, exportChildren) => {
    if (!$isQuoteNode(node)) {
      return null;
    }

    const lines = exportChildren(node).split('\n');
    const output = [];
    for (const line of lines) {
      output.push('> ' + line);
    }
    return output.join('\n');
  },
  regExp: /^>\s/,
  replace: (parentNode, children, _match, isImport) => {
    if (isImport) {
      const previousNode = parentNode.getPreviousSibling();
      if ($isQuoteNode(previousNode)) {
        previousNode.splice(previousNode.getChildrenSize(), 0, [
          $createLineBreakNode(),
          ...children,
        ]);
        previousNode.select(0, 0);
        parentNode.remove();
        return;
      }
    }

    const node = $createQuoteNode();
    node.append(...children);
    parentNode.replace(node);
    node.select(0, 0);
  },
  type: 'element',
};
/*
export const CODE: ElementTransformer = {
  dependencies: [CodeNode],
  export: (node: LexicalNode) => {
    if (!$isCodeNode(node)) {
      return null;
    }
    const textContent = node.getTextContent();
    return (
      '```' +
      (node.getLanguage() || '') +
      (textContent ? '\n' + textContent : '') +
      '\n' +
      '```'
    );
  },
  regExp: /^[ \t]*```(\w{1,10})?\s/,
  replace: createBlockNode((match) => {
    return $createCodeNode(match ? match[1] : undefined);
  }),
  type: 'element',
};
*/
export const UNORDERED_LIST: ElementTransformer = {
  dependencies: [ListNode, ListItemNode],
  export: (node, exportChildren) => {
    return $isListNode(node) ? listExport(node, exportChildren, 0) : null;
  },
  regExp: /^(\s*)[-*+]\s/,
  replace: listReplace('bullet'),
  type: 'element',
};

export const CHECK_LIST: ElementTransformer = {
  dependencies: [ListNode, ListItemNode],
  export: (node, exportChildren) => {
    return $isListNode(node) ? listExport(node, exportChildren, 0) : null;
  },
  regExp: /^(\s*)(?:-\s)?\s?(\[(\s|x)?\])\s/i,
  replace: listReplace('check'),
  type: 'element',
};

export const ORDERED_LIST: ElementTransformer = {
  dependencies: [ListNode, ListItemNode],
  export: (node, exportChildren) => {
    return $isListNode(node) ? listExport(node, exportChildren, 0) : null;
  },
  regExp: /^(\s*)(\d{1,})\.\s/,
  replace: listReplace('number'),
  type: 'element',
};

export const INLINE_CODE: TextFormatTransformer = {
  format: ['code'],
  tag: '`',
  type: 'text-format',
};

export const HIGHLIGHT: TextFormatTransformer = {
  format: ['highlight'],
  tag: '==',
  type: 'text-format',
};

export const BOLD_ITALIC_STAR: TextFormatTransformer = {
  format: ['bold', 'italic'],
  tag: '***',
  type: 'text-format',
};

export const BOLD_ITALIC_UNDERSCORE: TextFormatTransformer = {
  format: ['bold', 'italic'],
  intraword: false,
  tag: '___',
  type: 'text-format',
};

export const BOLD_STAR: TextFormatTransformer = {
  format: ['bold'],
  tag: '**',
  type: 'text-format',
};

export const BOLD_UNDERSCORE: TextFormatTransformer = {
  format: ['bold'],
  intraword: false,
  tag: '__',
  type: 'text-format',
};

export const STRIKETHROUGH: TextFormatTransformer = {
  format: ['strikethrough'],
  tag: '~~',
  type: 'text-format',
};

export const ITALIC_STAR: TextFormatTransformer = {
  format: ['italic'],
  tag: '*',
  type: 'text-format',
};

export const ITALIC_UNDERSCORE: TextFormatTransformer = {
  format: ['italic'],
  intraword: false,
  tag: '_',
  type: 'text-format',
};

// Order of text transformers matters:
//
// - code should go first as it prevents any transformations inside
// - then longer tags match (e.g. ** or __ should go before * or _)
export const LINK: TextMatchTransformer = {
  dependencies: [LinkNode],
  export: (node, exportChildren, exportFormat) => {
    if (!$isLinkNode(node)) {
      return null;
    }
    const title = node.getTitle();
    const linkContent = title
      ? `[${node.getTextContent()}](${node.getURL()} "${title}")`
      : `[${node.getTextContent()}](${node.getURL()})`;
    const firstChild = node.getFirstChild();
    // Add text styles only if link has single text node inside. If it's more
    // then one we ignore it as markdown does not support nested styles for links
    if (node.getChildrenSize() === 1 && $isTextNode(firstChild)) {
      return exportFormat(firstChild, linkContent);
    } else {
      return linkContent;
    }
  },
  importRegExp:
    /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))/,
  regExp:
    /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))$/,
  replace: (textNode, match) => {
    const [, linkText, linkUrl, linkTitle] = match;
    const linkNode = $createLinkNode(linkUrl, {title: linkTitle});
    const linkTextNode = $createTextNode(linkText);
    linkTextNode.setFormat(textNode.getFormat());
    linkNode.append(linkTextNode);
    textNode.replace(linkNode);
  },
  trigger: ')',
  type: 'text-match',
};


const ELEMENT_TRANSFORMERS: Array<ElementTransformer> = [
//  HEADING,
//  QUOTE,
//  CODE,
  UNORDERED_LIST,
//  ORDERED_LIST,
];

const TEXT_FORMAT_TRANSFORMERS: Array<TextFormatTransformer> = [
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HIGHLIGHT,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
];

const TEXT_MATCH_TRANSFORMERS: Array<TextMatchTransformer> = [LINK];

const TRANSFORMERS: Array<Transformer> = [
  ...ELEMENT_TRANSFORMERS,
 // ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
];

export function indexBy<T>(
  list: Array<T>,
  callback: (arg0: T) => string,
): Readonly<Record<string, Array<T>>> {
  const index: Record<string, Array<T>> = {};

  for (const item of list) {
    const key = callback(item);

    if (index[key]) {
      index[key].push(item);
    } else {
      index[key] = [item];
    }
  }

  return index;
}


export function transformersByType(transformers: Array<Transformer>): Readonly<{
  element: Array<ElementTransformer>;
  textFormat: Array<TextFormatTransformer>;
  textMatch: Array<TextMatchTransformer>;
}> {
  const byType = indexBy(transformers, (t) => t.type);

  return {
    element: (byType.element || []) as Array<ElementTransformer>,
    textFormat: (byType['text-format'] || []) as Array<TextFormatTransformer>,
    textMatch: (byType['text-match'] || []) as Array<TextMatchTransformer>,
  };
}

const MARKDOWN_EMPTY_LINE_REG_EXP = /^\s{0,3}$/;

export function isEmptyParagraph(node: LexicalNode): boolean {
  if (!$isParagraphNode(node)) {
    return false;
  }

  const firstChild = node.getFirstChild();
  return (
    firstChild == null ||
    (node.getChildrenSize() === 1 &&
      $isTextNode (firstChild) &&
      MARKDOWN_EMPTY_LINE_REG_EXP.test(firstChild.getTextContent()))
  );
}


export const CAN_USE_DOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';

  declare global {
    interface Document {
      documentMode?: unknown;
    }
  
    interface Window {
      MSStream?: unknown;
    }
  }
  
  const documentMode =
    CAN_USE_DOM && 'documentMode' in document ? document.documentMode : null;
  
  export const IS_APPLE: boolean =
    CAN_USE_DOM && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
  export const IS_FIREFOX: boolean =
    CAN_USE_DOM && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);
  
  export const CAN_USE_BEFORE_INPUT: boolean =
    CAN_USE_DOM && 'InputEvent' in window && !documentMode
      ? 'getTargetRanges' in new window.InputEvent('input')
      : false;
  
  export const IS_SAFARI: boolean =
    CAN_USE_DOM && /Version\/[\d.]+.*Safari/.test(navigator.userAgent);
  
  export const IS_IOS: boolean =
    CAN_USE_DOM &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream;
  
  export const IS_ANDROID: boolean =
    CAN_USE_DOM && /Android/.test(navigator.userAgent);
  
  // Keep these in case we need to use them in the future.
  // export const IS_WINDOWS: boolean = CAN_USE_DOM && /Win/.test(navigator.platform);
  export const IS_CHROME: boolean =
    CAN_USE_DOM && /^(?=.*Chrome).*/i.test(navigator.userAgent);
  // export const canUseTextInputEvent: boolean = CAN_USE_DOM && 'TextEvent' in window && !documentMode;
  
  export const IS_ANDROID_CHROME: boolean =
    CAN_USE_DOM && IS_ANDROID && IS_CHROME;
  
  export const IS_APPLE_WEBKIT =
    CAN_USE_DOM && /AppleWebKit\/[\d.]+/.test(navigator.userAgent) && !IS_CHROME;
  

const CODE_BLOCK_REG_EXP = /^[ \t]*```(\w{1,10})?\s?$/;
type TextFormatTransformersIndex = Readonly<{
  fullMatchRegExpByTag: Readonly<Record<string, RegExp>>;
  openTagsRegExp: RegExp;
  transformersByTag: Readonly<Record<string, TextFormatTransformer>>;
}>;

export function createMarkdownImport(
  transformers: Array<Transformer>,
  shouldMoveSelection: boolean,
  shouldPreserveNewLines = false,
): (markdownString: string, node?: ElementNode) => void {
  const byType = transformersByType(transformers);
  const textFormatTransformersIndex = createTextFormatTransformersIndex(
    byType.textFormat,
  );

  return (markdownString, node) => {
    const lines = markdownString.split('\n');
    const linesLength = lines.length;
    const root = node || $getRoot();
    root.clear();

    for (let i = 0; i < linesLength; i++) {
      const lineText = lines[i];
      // Codeblocks are processed first as anything inside such block
      // is ignored for further processing
      // TODO:
      // Abstract it to be dynamic as other transformers (add multiline match option)
      //const [codeBlockNode, shiftedIndex] = $importCodeBlock(lines, i, root);

      //if (codeBlockNode != null) {
      //  i = shiftedIndex;
      //  continue;
      //}

      $importBlocks(
        lineText,
        root,
        byType.element,
        textFormatTransformersIndex,
        byType.textMatch,
      );
    }

    // By default, removing empty paragraphs as md does not really
    // allow empty lines and uses them as delimiter.
    // If you need empty lines set shouldPreserveNewLines = true.
    const children = root.getChildren();
    for (const child of children) {
      if (
        !shouldPreserveNewLines &&
        isEmptyParagraph(child) &&
        root.getChildrenSize() > 1
      ) {
        child.remove();
      }
    }

    if (shouldMoveSelection && $getSelection() !== null) {
      root.selectEnd();
    }
  };
}

function $importBlocks(
  lineText: string,
  rootNode: ElementNode,
  elementTransformers: Array<ElementTransformer>,
  textFormatTransformersIndex: TextFormatTransformersIndex,
  textMatchTransformers: Array<TextMatchTransformer>,
) {
  const lineTextTrimmed = lineText.trim();
  const textNode = $createTextNode(lineTextTrimmed);
  const elementNode = $createParagraphNode();
  elementNode.append(textNode);
  rootNode.append(elementNode);
  
  for (const {regExp, replace} of elementTransformers) {
    const match = lineText.match(regExp);
    
    if (match) {
      textNode.setTextContent(lineText.slice(match[0].length));
      replace(elementNode, [textNode], match, true);
      break;
    }
  }

  importTextFormatTransformers(
    textNode,
    textFormatTransformersIndex,
    textMatchTransformers,
  );

  // If no transformer found and we left with original paragraph node
  // can check if its content can be appended to the previous node
  // if it's a paragraph, quote or list
  if (elementNode.isAttached() && lineTextTrimmed.length > 0) {
    const previousNode = elementNode.getPreviousSibling();
    if (
      $isParagraphNode(previousNode) ||
      $isQuoteNode(previousNode) ||
      $isListNode(previousNode)
    ) {
      let targetNode: typeof previousNode | ListItemNode | null = previousNode;

      if ($isListNode(previousNode)) {
        const lastDescendant = previousNode.getLastDescendant();
        if (lastDescendant == null) {
          targetNode = null;
        } else {
          targetNode = $findMatchingParent(lastDescendant, $isListItemNode);
        }
      }

      if (targetNode != null && targetNode.getTextContentSize() > 0) {
        targetNode.splice(targetNode.getChildrenSize(), 0, [
          $createLineBreakNode(),
          ...elementNode.getChildren(),
        ]);
        elementNode.remove();
      }
    }
  }
}
/*
function $importCodeBlock(
  lines: Array<string>,
  startLineIndex: number,
  rootNode: ElementNode,
): [CodeNode | null, number] {
  const openMatch = lines[startLineIndex].match(CODE_BLOCK_REG_EXP);

  if (openMatch) {
    let endLineIndex = startLineIndex;
    const linesLength = lines.length;

    while (++endLineIndex < linesLength) {
      const closeMatch = lines[endLineIndex].match(CODE_BLOCK_REG_EXP);

      if (closeMatch) {
        const codeBlockNode = $createCodeNode(openMatch[1]);
        const textNode = $createTextNode(
          lines.slice(startLineIndex + 1, endLineIndex).join('\n'),
        );
        codeBlockNode.append(textNode);
        rootNode.append(codeBlockNode);
        return [codeBlockNode, endLineIndex];
      }
    }
  }

  return [null, startLineIndex];
}
*/
// Processing text content and replaces text format tags.
// It takes outermost tag match and its content, creates text node with
// format based on tag and then recursively executed over node's content
//
// E.g. for "*Hello **world**!*" string it will create text node with
// "Hello **world**!" content and italic format and run recursively over
// its content to transform "**world**" part
function importTextFormatTransformers(
  textNode: TextNode,
  textFormatTransformersIndex: TextFormatTransformersIndex,
  textMatchTransformers: Array<TextMatchTransformer>,
) {
  const textContent = textNode.getTextContent();
  const match = findOutermostMatch(textContent, textFormatTransformersIndex);

  if (!match) {
    // Once text format processing is done run text match transformers, as it
    // only can span within single text node (unline formats that can cover multiple nodes)
    importTextMatchTransformers(textNode, textMatchTransformers);
    return;
  }

  let currentNode, remainderNode, leadingNode;

  // If matching full content there's no need to run splitText and can reuse existing textNode
  // to update its content and apply format. E.g. for **_Hello_** string after applying bold
  // format (**) it will reuse the same text node to apply italic (_)
  if (match[0] === textContent) {
    currentNode = textNode;
  } else {
    const startIndex = match.index || 0;
    const endIndex = startIndex + match[0].length;

    if (startIndex === 0) {
      [currentNode, remainderNode] = textNode.splitText(endIndex);
    } else {
      [leadingNode, currentNode, remainderNode] = textNode.splitText(
        startIndex,
        endIndex,
      );
    }
  }

  currentNode.setTextContent(match[2]);
  const transformer = textFormatTransformersIndex.transformersByTag[match[1]];

  if (transformer) {
    for (const format of transformer.format) {
      if (!currentNode.hasFormat(format)) {
        currentNode.toggleFormat(format);
      }
    }
  }

  // Recursively run over inner text if it's not inline code
  if (!currentNode.hasFormat('code')) {
    importTextFormatTransformers(
      currentNode,
      textFormatTransformersIndex,
      textMatchTransformers,
    );
  }

  // Run over leading/remaining text if any
  if (leadingNode) {
    importTextFormatTransformers(
      leadingNode,
      textFormatTransformersIndex,
      textMatchTransformers,
    );
  }

  if (remainderNode) {
    importTextFormatTransformers(
      remainderNode,
      textFormatTransformersIndex,
      textMatchTransformers,
    );
  }
}

function importTextMatchTransformers(
  textNode_: TextNode,
  textMatchTransformers: Array<TextMatchTransformer>,
) {
  let textNode = textNode_;

  mainLoop: while (textNode) {
    for (const transformer of textMatchTransformers) {
      const match = textNode.getTextContent().match(transformer.importRegExp);

      if (!match) {
        continue;
      }

      const startIndex = match.index || 0;
      const endIndex = startIndex + match[0].length;
      let replaceNode, newTextNode;

      if (startIndex === 0) {
        [replaceNode, textNode] = textNode.splitText(endIndex);
      } else {
        [, replaceNode, newTextNode] = textNode.splitText(startIndex, endIndex);
      }

      if (newTextNode) {
        importTextMatchTransformers(newTextNode, textMatchTransformers);
      }
      transformer.replace(replaceNode, match);
      continue mainLoop;
    }

    break;
  }
}

// Finds first "<tag>content<tag>" match that is not nested into another tag
function findOutermostMatch(
  textContent: string,
  textTransformersIndex: TextFormatTransformersIndex,
): RegExpMatchArray | null {
  const openTagsMatch = textContent.match(textTransformersIndex.openTagsRegExp);

  if (openTagsMatch == null) {
    return null;
  }

  for (const match of openTagsMatch) {
    // Open tags reg exp might capture leading space so removing it
    // before using match to find transformer
    const tag = match.replace(/^\s/, '');
    const fullMatchRegExp = textTransformersIndex.fullMatchRegExpByTag[tag];
    if (fullMatchRegExp == null) {
      continue;
    }

    const fullMatch = textContent.match(fullMatchRegExp);
    const transformer = textTransformersIndex.transformersByTag[tag];
    if (fullMatch != null && transformer != null) {
      if (transformer.intraword !== false) {
        return fullMatch;
      }

      // For non-intraword transformers checking if it's within a word
      // or surrounded with space/punctuation/newline
      const {index = 0} = fullMatch;
      const beforeChar = textContent[index - 1];
      const afterChar = textContent[index + fullMatch[0].length];

      if (
        (!beforeChar || PUNCTUATION_OR_SPACE.test(beforeChar)) &&
        (!afterChar || PUNCTUATION_OR_SPACE.test(afterChar))
      ) {
        return fullMatch;
      }
    }
  }

  return null;
}

function createTextFormatTransformersIndex(
  textTransformers: Array<TextFormatTransformer>,
): TextFormatTransformersIndex {
  const transformersByTag: Record<string, TextFormatTransformer> = {};
  const fullMatchRegExpByTag: Record<string, RegExp> = {};
  const openTagsRegExp = [];
  const escapeRegExp = `(?<![\\\\])`;

  for (const transformer of textTransformers) {
    const {tag} = transformer;
    transformersByTag[tag] = transformer;
    const tagRegExp = tag.replace(/(\*|\^|\+)/g, '\\$1');
    openTagsRegExp.push(tagRegExp);

    if (IS_SAFARI || IS_IOS || IS_APPLE_WEBKIT) {
      fullMatchRegExpByTag[tag] = new RegExp(
        `(${tagRegExp})(?![${tagRegExp}\\s])(.*?[^${tagRegExp}\\s])${tagRegExp}(?!${tagRegExp})`,
      );
    } else {
      fullMatchRegExpByTag[tag] = new RegExp(
        `(?<![\\\\${tagRegExp}])(${tagRegExp})((\\\\${tagRegExp})?.*?[^${tagRegExp}\\s](\\\\${tagRegExp})?)((?<!\\\\)|(?<=\\\\\\\\))(${tagRegExp})(?![\\\\${tagRegExp}])`,
      );
    }
  }

  return {
    // Reg exp to find open tag + content + close tag
    fullMatchRegExpByTag,
    // Reg exp to find opening tags
    openTagsRegExp: new RegExp(
      (IS_SAFARI || IS_IOS || IS_APPLE_WEBKIT ? '' : `${escapeRegExp}`) +
        '(' +
        openTagsRegExp.join('|') +
        ')',
      'g',
    ),
    transformersByTag,
  };
}

export function $myConvertFromMarkdownString(
  markdown: string,
  shouldMoveSelection = true,
  node?: ElementNode,
  transformers: Array<Transformer> = TRANSFORMERS,
  shouldPreserveNewLines = true,
): void {
  const importMarkdown = createMarkdownImport(
    transformers,
    shouldMoveSelection,
    shouldPreserveNewLines,
  );
  return importMarkdown(markdown, node);
}
