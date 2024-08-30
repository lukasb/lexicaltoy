import { createToken, Lexer, CstParser, TokenType, IToken, CstNode } from "chevrotain";
import { Page } from "../definitions";
import { DialogueElement } from "../ai";
import { FormulaOutput, FormulaOutputType } from "./formula-definitions";
import { askCallback, findCallback } from "./function-definitions";

interface NodeType {
  name: string;
  description: string;
  regex: RegExp;
}

interface ArgumentDefinition {
  name: string;
  type: "string" | "string_set" | "wikilink" | "type_or_types";
  description: string;
  required: boolean;
  variadic?: boolean;  // New field to indicate variadic arguments
}

export interface DefaultArguments {
  pages?: Page[];
  dialogueElements?: DialogueElement[];
}

export interface FunctionDefinition {
  name: string;
  arguments: ArgumentDefinition[];
  description: string;
  callback: (defaultArgs: DefaultArguments, ...args: any[]) => Promise<FormulaOutput | null>;
  formulaOutputType: FormulaOutputType;
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
];

export const functionDefinitions: FunctionDefinition[] = [
  {
      name: "ask",
      arguments: [
          {
              name: "question",
              type: "string",
              description: "The question to ask",
              required: true
          },
          {
              name: "context",
              type: "wikilink",
              description: "Additional context pages",
              required: false,
              variadic: true
          }
      ],
      description: "Ask a question with optional context",
      callback: askCallback,
      formulaOutputType: FormulaOutputType.Text
  },
  {
      name: "find",
      arguments: [
          {
              name: "terms",
              type: "string_set",
              description: "Search terms",
              required: true
          },
          {
            name: "types",
            type: "type_or_types",
            description: "Node types to include",
            required: false
          }
      ],
      description: "Find notes matching the given terms",
      callback: findCallback,
      formulaOutputType: FormulaOutputType.NodeMarkdown
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

// Define tokens
const Equal = createToken({ name: "Equal", pattern: /=/ });
const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z]\w*/ });
const TodoStatus = createToken({ name: "TodoStatus", pattern: /TODO|DONE|NOW|WAITING|DOING/, longer_alt: Identifier });
const StringLiteral = createToken({ name: "StringLiteral", pattern: /"(?:[^"\\]|\\.)*"/ });
const SpecialToken = createToken({ name: "SpecialToken", pattern: /#[a-zA-Z]+/ });
const Pipe = createToken({ name: "Pipe", pattern: /\|/ });
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });
const Comma = createToken({ name: "Comma", pattern: /,/ });
const FilePath = createToken({ name: "FilePath", pattern: /\[\[[^\]]+\]\]/ });

const allTokens = [
  Equal,
  StringLiteral,
  FilePath,
  SpecialToken,
  Identifier,
  Pipe,
  LParen,
  RParen,
  Comma,
];

const FormulaLexer = new Lexer(allTokens);

class FormulaParser extends CstParser {
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
    this.OR([
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(SpecialToken) },
      { ALT: () => this.SUBRULE(this.pipeExpression) },
      { ALT: () => this.SUBRULE(this.functionCall) },
      { ALT: () => this.CONSUME(FilePath) },
    ]);
  });

  pipeExpression = this.RULE("pipeExpression", () => {
    this.CONSUME(TodoStatus);
    this.AT_LEAST_ONE(() => {
      this.CONSUME(Pipe);
      this.CONSUME2(TodoStatus);
    });
  });
}

const parser = new FormulaParser();

export function parseFormula(input: string) {
  const lexResult = FormulaLexer.tokenize(input);
  parser.input = lexResult.tokens;
  const cst = parser.formula();
  
  if (parser.errors.length > 0) {
      const errorMessages = parser.errors.map(error => error.message).join("; ");
      throw new Error(`Parsing errors detected: ${errorMessages}`);
  }
  return cst;
}

export function getFormulaOutputType(formula: string): FormulaOutputType | null {
  try {
      // Parse the formula using our parser
      const parsedFormula = parseFormula(formula) as CstNodeWithChildren;

      // Extract function name from the parsed formula
      const functionCallNode = getChildrenByName(parsedFormula, 'functionCall')[0] as CstNodeWithChildren;
      const functionName = getTokenImage(getChildrenByName(functionCallNode, 'Identifier')[0]);

      // Find the corresponding function definition
      const funcDef = functionDefinitions.find(def => def.name === functionName);

      if (funcDef) {
          // Return the formula output type of the function
          return funcDef.formulaOutputType;
      } else {
          console.error(`Unknown function: ${functionName}`);
          return null;
      }
  } catch (error) {
      console.error("Error parsing formula:", error);
      return null;
  }
}