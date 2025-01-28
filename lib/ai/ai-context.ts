export type DialogueElement = {
  role: 'user' | 'assistant';
  content: string;
}

export type DocumentSource = {
  type: 'text';
  media_type: string;
  data: string;
};

export type DocumentContent = {
  type: 'document';
  source: DocumentSource;
  title: string;
  context?: string;
  citations?: {
    enabled: boolean;
  };
};

export type TextContent = {
  type: 'text';
  text: string;
};

export type ContentElement = DocumentContent | TextContent;

export type MultiContentDialogueElement = {
  role: 'user' | 'assistant';
  content: ContentElement[];
};

export type PageAndDialogueContext = {
  dialogueContext: DialogueElement[];
  priorMarkdown: string; // Markdown from nodes above provided dialogueContext
}

export const instructionsWithContext = `
You will receive user questions or instructions, and content from one or more user documents called pages. Pages will look like this:

## Today's agenda
Hmmm ... need to figure out meaning of life today.
- TODO buy groceries
- DOING prepare taxes
- NOW call janet
- =find("#parser")
- =ask("What is the meaning of life?") |||result: There has been much debate on this topic.
The most common answer is 42.
|||
- =why 42? |||result: Because 6*7=42|||
- LATER write a letter to grandma
- DONE make a cake
- Who should I invite?
 - John
 - Jane
 - Mary
## END OF PAGE CONTENTS

Bullet points that start with TODO, DOING, NOW, LATER, DONE, or WAITING are todos. Bullet points that start with = are formulas.
Formulas that start with ask(), or don't have an explicit function, trigger a chat with GPT.
`;