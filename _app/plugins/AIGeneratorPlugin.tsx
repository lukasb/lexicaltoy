import type { LexicalEditor } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { mergeRegister } from "@lexical/utils";
import { AI_GENERATE_NODES } from "@/lib/ai-commands";
import { COMMAND_PRIORITY_EDITOR } from "lexical";
import { $getSelection, $getRoot } from "lexical";
import { getListItemFromSelection, $createAndAddChildren } from "@/lib/list-utils";
import { getMarkdownUpTo } from "@/lib/formula/formula-context-helpers";
import { getGPTGeneration } from "@/lib/ai";
import { getPromptWithContextForGeneration } from "@/lib/formula/gpt-formula-handlers";

async function aiGenerate(editor: LexicalEditor) {
  const theSelection = $getSelection();
  if (!theSelection)  return;
  const listItem = getListItemFromSelection(theSelection);
  if (!listItem) return;
  const priorMarkdown = getMarkdownUpTo(listItem.__key, $getRoot());
  const prompt = listItem.getTextContent();
  const fullPrompt = getPromptWithContextForGeneration(prompt, priorMarkdown);
  const newListItems = await getGPTGeneration(fullPrompt);
  if (!newListItems) return;
  editor.update(() => {
    $createAndAddChildren(listItem, newListItems);
  });
}

function registerAIGenerator(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(AI_GENERATE_NODES, () => {
      aiGenerate(editor);
      return true;
    }, COMMAND_PRIORITY_EDITOR)
  );
}

export function AIGeneratorPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    registerAIGenerator(editor);
  }, [editor]);
  return null;
}