import { createToken, Lexer, CstParser, TokenType, IToken, CstNode } from "chevrotain";
import { Page } from "../definitions";
import { DialogueElement } from "../ai";
import { FormulaOutput, FormulaValueType } from "./formula-definitions";
import { askCallback, findCallback, getUrlCallback } from "./function-definitions";
import { PageAndDialogueContext } from "./FormulaOutput";
import { usePageStatusStore } from "@/lib/stores/page-status-store";
import type { PageStatusState } from "@/lib/stores/page-status-store";

interface NodeType {
  name: string;
  description: string;
  regex: RegExp;
}

interface PossibleArguments {
  displayName: string;
  type: FormulaValueType;
  description: string;
  regex?: RegExp;
  nameDisplayHelper?: (input: string) => string;
  descriptionDisplayHelper?: (input: string) => string;
  shouldShow?: (input: string) => boolean;
}

const TODO_STATUS_REGEX_LEXER = /(now|later|doing|waiting|done|todos|todo)(\|(now|later|doing|waiting|done|todos|todo))*/i;
export const TODO_STATUS_REGEX_EXTERNAL = /^(now|later|doing|waiting|done|todos|todo)(\|(now|later|doing|waiting|done|todos|todo))*$/i;

// the order of these is important - it will take the first match
export const possibleArguments: PossibleArguments[] = [
  {
    displayName: "journals/",
    type: FormulaValueType.Wikilink,
    description: "include the last six weeks of journal entries",
    regex: /^\[\[journals\/\]\]$/,
    shouldShow: (input: string) => {
      return (input.length === 0 || "journals/".startsWith(input));
    }
  },
  {
    displayName: "foldername/",
    type: FormulaValueType.Wikilink,
    description: "include the contents of all pages that start with foldername",
    regex: /^\[\[.*?\/\]\]$/,
    nameDisplayHelper: (input: string) => { 
      const folderName = input.length > 0 ? input : "foldername";
      return folderName + "/"; 
    },
    descriptionDisplayHelper: (input: string) => { 
      const folderName = input.length > 0 ? input : "foldername";
      return "include the contents of all pages whose titles start with " + folderName; 
    },
    shouldShow: (input: string) => {
      return (input !== "journals");
    }
  },
  {
    displayName: "wikilink",
    type: FormulaValueType.Wikilink,
    description: 'add a [[wikilink]] to include the contents of a page',
    regex: /^\[\[[^\]]+\]\]$/
  },
  {
    displayName: "text",
    type: FormulaValueType.Text,
    description: 'text in quote marks "like this"',
    regex: /^\"[^\"]*\"$/
  },
  {
    displayName: "todos by status",
    type: FormulaValueType.NodeTypeOrTypes,
    description: "todo, done, now, waiting, or doing. separate with | to search for multiple, or enter 'todos' to search for any todo status",
    regex: TODO_STATUS_REGEX_EXTERNAL
  },
  {
    displayName: "context:",
    type: FormulaValueType.NodeMarkdown,
    description: "context:off starts a new conversation without sending any page contents.\ncontext:new starts a new conversation with the current page contents.",
    regex: /^context:(off|new)$/
  },
]

export interface DefaultArguments {
  pages?: Page[];
  context?: PageAndDialogueContext;
  pageUpdateContext?: PageStatusState;
}

// TODO I define these in like three places, need to consolidate
export const nodeTypes: NodeType[] = [
  {
    name: "todo",
    description: "Todo with status TODO",
    regex: /^TODO/
  },
  {
    name: "done",
    description: "Todo with status DONE",
    regex: /^DONE/
  },
  {
    name: "now",
    description: "Todo with status NOW",
    regex: /^NOW/
  },
  {
    name: "waiting",
    description: "Todo with status WAITING",
    regex: /^WAITING/
  },
  {
    name: "doing",
    description: "Todo with status DOING",
    regex: /^DOING/
  },
  {
    name: "later",
    description: "Todo with status LATER",
    regex: /^LATER/
  },
];

export interface FunctionDefinition {
  name: string;
  allowedArgumentTypes: FormulaValueType[];
  description: string;
  example: string;
  callback: (defaultArgs: DefaultArguments, userArgs: FormulaOutput[]) => Promise<FormulaOutput | null>;
  formulaOutputType: FormulaValueType;
}

export const functionDefinitions: FunctionDefinition[] = [
  {
      name: "ask",
      allowedArgumentTypes: [
          FormulaValueType.Text,
          FormulaValueType.NodeMarkdown
      ],
      description: "Ask ChatGPT a question",
      example: 'ask("I need a pasta sauce without onions",[[recipes/]]',
      callback: askCallback,
      formulaOutputType: FormulaValueType.Text
  },
  {
      name: "find",
      allowedArgumentTypes: [
          FormulaValueType.Text,
          FormulaValueType.NodeTypeOrTypes
      ],
      description: "Find text or todos in your notes",
      example: 'find("#taxes",todos)',
      callback: findCallback,
      formulaOutputType: FormulaValueType.NodeMarkdown
  },
  {
      name: "getUrl",
      allowedArgumentTypes: [
        FormulaValueType.Text
      ],
      description: "Get the contents of one or more URLs as Markdown",
      example: 'getUrl("https://thekitchn.com/marcella-hazans-amazing-4ingre-144538")',
      callback: getUrlCallback,
      formulaOutputType: FormulaValueType.Text
  }
];

export interface CstNodeWithChildren extends CstNode {
  children: {
      [key: string]: (CstNodeWithChildren | IToken)[];
  };
}

// Helper functions to safely extract data from CST
export function getChildrenByName(node: CstNode, name: string): (CstNodeWithChildren | IToken)[] {
  return (node as CstNodeWithChildren).children[name] || [];
}

export function getTokenImage(token: IToken | CstNodeWithChildren): string {
  return 'image' in token ? token.image : '';
}

const Equal = createToken({ name: "Equal", pattern: /=/ });
const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z]\w*/ });
const TodoStatus = createToken({
  name: "TodoStatus",
  pattern: TODO_STATUS_REGEX_LEXER,
  longer_alt: Identifier
});
const StringLiteral = createToken({ name: "StringLiteral", pattern: /"(?:[^"\\]|\\.)*"/ });
const SpecialToken = createToken({ name: "SpecialToken", pattern: /#[a-zA-Z]+/ });
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });
const Comma = createToken({ name: "Comma", pattern: /,/ });
const Wikilink = createToken({ name: "Wikilink", pattern: /\[\[[^\]]+\]\]/ });
const Not = createToken({ name: "Not", pattern: /!/ });

const allTokens = [
  Equal,
  StringLiteral,
  Wikilink,
  SpecialToken,
  TodoStatus,
  Not,
  Identifier,
  LParen,
  RParen,
  Comma,
];

export const FormulaLexer = new Lexer(allTokens);

export class FormulaParser extends CstParser {
  constructor() {
    super(allTokens);
    this.performSelfAnalysis();
  }

  formula = this.RULE("formula", () => {
    this.CONSUME(Equal);
    this.SUBRULE(this.functionCall);
  });

  functionCall = this.RULE("functionCall", () => {
    this.CONSUME(Identifier);
    this.CONSUME(LParen);
    this.SUBRULE(this.argumentList);
    this.CONSUME(RParen);
  });

  argumentList = this.RULE("argumentList", () => {
    this.SUBRULE(this.argument);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.argument);
    });
  });

  argument = this.RULE("argument", () => {
    this.OPTION(() => {
      this.CONSUME(Not);
    });
    this.OR([
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(SpecialToken) },
      { ALT: () => this.CONSUME(TodoStatus) },
      { ALT: () => this.SUBRULE(this.functionCall) },
      { ALT: () => this.CONSUME(Wikilink) },
    ]);
  });
}

const parser = new FormulaParser();

const normalizeQuotes = (input: string): string => {
  // Convert left/right curly quotes and other quote variants to straight quotes
  return input.replace(/[\u201C\u201D\u201E\u201F\u2033\u2034\u2057]/g, '"');
};

export function parseFormula(input: string) {
  const normalizedInput = normalizeQuotes(input);
  const lexResult = FormulaLexer.tokenize(normalizedInput);
  parser.input = lexResult.tokens;
  const cst = parser.formula();
  
  if (parser.errors.length > 0) {
      const errorMessages = parser.errors.map(error => error.message).join("; ");
      throw new Error(`Parsing errors detected: ${errorMessages}`);
  }
  return cst;
}

export function getFormulaOutputType(formula: string): FormulaValueType | null {
  let fullFormula = formula.startsWith("=") ? formula : `=${formula}`;
  try {
      // Parse the formula using our parser
      const parsedFormula = parseFormula(fullFormula) as CstNodeWithChildren;

      // Extract function name from the parsed formula
      const functionCallNode = getChildrenByName(parsedFormula, 'functionCall')[0] as CstNodeWithChildren;
      const functionName = getTokenImage(getChildrenByName(functionCallNode, 'Identifier')[0]);

      // Find the corresponding function definition
      const funcDef = functionDefinitions.find(def => def.name === functionName);

      if (funcDef) {
          // Return the formula output type of the function
          return funcDef.formulaOutputType;
      } else {
          console.log(`🛑 Unknown function: ${functionName}`);
          return null;
      }
  } catch (error) {
      //console.error("Error parsing formula:", error);
      return null;
  }
}

export function argumentTypeMatch(argumentValue: string, argumentType: FormulaValueType): boolean {
  // Strip the NOT operator if present
  const valueToCheck = argumentValue.startsWith('!') ? argumentValue.slice(1) : argumentValue;
  
  const possibleArgumentsForType = possibleArguments.filter(arg => arg.type === argumentType);
  for (const arg of possibleArgumentsForType) {
    if (arg.regex && arg.regex.test(valueToCheck)) {
      return true;
    }
  }
  return false;
}