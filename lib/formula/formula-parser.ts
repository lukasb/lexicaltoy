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

const Equal = createToken({ name: "Equal", pattern: /=/ });
const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z]\w*/ });
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });
const Comma = createToken({ name: "Comma", pattern: /,/ });
const StringLiteral = createToken({ name: "StringLiteral", pattern: /"(?:[^"\\]|\\.)*"/ });
const WikiLink = createToken({ name: "WikiLink", pattern: /\[\[[^\]]+\]\]/ });
const Word = createToken({ name: "Word", pattern: /[^\s|(),]+/ });
const Or = createToken({ name: "Or", pattern: /\|/ });
const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /\s+/, group: Lexer.SKIPPED });
const NodeType = createToken({ name: "NodeType", pattern: new RegExp(nodeTypes.map(type => type.name).join("|")) });

const allTokens = [Equal, Identifier, LParen, RParen, Comma, StringLiteral, WikiLink, Word, Or, WhiteSpace, NodeType];
const FormulaLexer = new Lexer(allTokens);

class FormulaParser extends CstParser {
  private currentFunction: FunctionDefinition | null = null;
  private currentArgIndex: number = 0;

  constructor() {
      super(allTokens, {
          recoveryEnabled: true,
      });
      this.performSelfAnalysis();
  }

  formula = this.RULE("formula", () => {
      this.CONSUME(Equal);
      this.SUBRULE(this.functionCall);
  });

  functionCall = this.RULE("functionCall", () => {
      const funcToken = this.CONSUME(Identifier);

      this.ACTION(() => {
        this.currentFunction = functionDefinitions.find(def => def.name === funcToken.image) || null;
        if (!this.currentFunction) {
          this.RAISE_ERROR(funcToken, `Unknown function: ${funcToken.image}`);
        }
      });
      
      this.CONSUME(LParen);
      this.OPTION(() => {
          this.SUBRULE(this.argumentList);
      });
      this.CONSUME(RParen);
      this.currentFunction = null;
      this.currentArgIndex = 0;
  });

  argumentList = this.RULE("argumentList", () => {
    this.SUBRULE(this.argument);
    this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.argument);
    });
  });

  argument = this.RULE("argument", () => {
    if (!this.currentFunction) {
        this.RAISE_ERROR(this.LA(1), "Unexpected argument outside of function call");
        return;
    }

    let argDef = this.currentFunction.arguments[this.currentArgIndex];
    
    // If we've passed all defined arguments, check if the last one is variadic
    if (!argDef && this.currentArgIndex > 0) {
        const lastArgDef = this.currentFunction.arguments[this.currentFunction.arguments.length - 1];
        if (lastArgDef.variadic) {
            argDef = lastArgDef;
        } else {
            this.RAISE_ERROR(this.LA(1), `Too many arguments for function ${this.currentFunction.name}`);
            return;
        }
    }

    if (!argDef) {
        this.RAISE_ERROR(this.LA(1), `Unexpected argument for function ${this.currentFunction.name}`);
        return;
    }

    switch (argDef.type) {
        case "string":
            this.CONSUME(StringLiteral);
            break;
        case "string_set":
            this.SUBRULE(this.stringSet);
            break;
        case "wikilink":
            this.CONSUME(WikiLink);
            break;
        case "type_or_types":
            this.SUBRULE(this.typeOrTypes);
            break;
        default:
            this.RAISE_ERROR(this.LA(1), `Unknown argument type: ${argDef.type}`);
    }

    // Only increment the argument index if we're not dealing with a variadic argument
    // or if it's the first occurrence of the variadic argument
    if (!argDef.variadic || this.currentArgIndex < this.currentFunction.arguments.length - 1) {
        this.currentArgIndex++;
    }
  });

  stringSet = this.RULE("stringSet", () => {
    this.AT_LEAST_ONE_SEP({
      SEP: WhiteSpace,
      DEF: () => {
          this.OR([
              { ALT: () => this.SUBRULE(this.phrase) },
              { ALT: () => this.CONSUME(Word) }
          ]);
      }
  });
  });

  phrase = this.RULE("phrase", () => {
      this.CONSUME(StringLiteral);
  });

  typeOrTypes = this.RULE("typeOrTypes", () => {
    this.AT_LEAST_ONE_SEP({
        SEP: Or,
        DEF: () => this.CONSUME(NodeType)
    });
  });

  partialFormula = this.RULE("partialFormula", () => {
    this.OPTION(() => this.CONSUME(Equal));
    this.OPTION1(() => {
        this.SUBRULE(this.partialFunctionCall);
    });
  });

  partialFunctionCall = this.RULE("partialFunctionCall", () => {
      this.CONSUME(Identifier);
      this.OPTION(() => {
          this.CONSUME(LParen);
          this.OPTION1(() => {
              this.SUBRULE(this.partialArgumentList);
          });
          this.OPTION2(() => this.CONSUME(RParen));
      });
  });

  partialArgumentList = this.RULE("partialArgumentList", () => {
      this.MANY_SEP({
          SEP: Comma,
          DEF: () => {
              this.SUBRULE(this.argument);
          }
      });
  });

  RAISE_ERROR(token: IToken, message: string): void {
    console.error(message, token);
      // Skip to the end of the current function call to allow partial parsing to continue
      this.CONSUME(RParen, { LABEL: "RECOVERY" });
  }
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

function parsePartialFormula(input: string) {
  const lexResult = FormulaLexer.tokenize(input);
  parser.input = lexResult.tokens;
  const cst = parser.partialFormula();
  
  return {
      cst,
      errors: parser.errors,
      tokens: lexResult.tokens
  };
}

function getContextualHelp(input: string): string {
  const result = parsePartialFormula(input);
  const tokens = result.tokens;
  
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0].tokenType === Equal)) {
      return `Available functions: ${functionDefinitions.map(f => f.name).join(", ")}`;
  }
  
  if (tokens[1] && tokens[1].tokenType === Identifier) {
      const functionName = tokens[1].image;
      const funcDef = functionDefinitions.find(f => f.name === functionName);
      
      if (!funcDef) {
          return `Unknown function: ${functionName}. Available functions: ${functionDefinitions.map(f => f.name).join(", ")}`;
      }
      
      if (tokens[2]?.tokenType !== LParen) {
          return `${funcDef.description}. Start arguments with opening parenthesis.`;
      }
      
      const cst = result.cst as CstNodeWithChildren;
      const partialFunctionCall = cst.children.partialFunctionCall?.[0] as CstNodeWithChildren | undefined;
      const partialArgumentList = partialFunctionCall?.children.partialArgumentList?.[0] as CstNodeWithChildren | undefined;
      const args = partialArgumentList?.children.argument || [];
      const currentArgIndex = args.length;
      
      if (currentArgIndex < funcDef.arguments.length) {
        const currentArg = funcDef.arguments[currentArgIndex];
        let helpText = `${currentArg.description} (${currentArg.type})${currentArg.required ? " (required)" : " (optional)"}`;
        if (currentArg.variadic) {
            helpText += " (can be repeated)";
        }
        if (currentArg.type === "string_set") {
            helpText += ". Use spaces between terms, \"quotes\" for phrases, and | for OR";
        } else if (currentArg.type === "type_or_types") {
            helpText += `. Valid types: ${nodeTypes.map(type => type.name).join(", ")}. Use | for OR`;
        }
        return helpText;
      } else {
          return "All arguments provided. Close function with ')'";
      }
  }
  
  return "Continue entering your formula";
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