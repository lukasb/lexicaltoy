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