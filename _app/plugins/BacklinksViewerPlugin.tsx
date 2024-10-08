import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { NodeElementMarkdown } from '@/lib/formula/formula-definitions';
import { $getRoot } from 'lexical';
import { $createFormulaOutputSharedNodes } from './FormulaPlugin/formula-node-helpers';

type Props = {
  backlinks: NodeElementMarkdown[];
};

export function BacklinksViewerPlugin({backlinks}: Props): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        $createFormulaOutputSharedNodes({
          editor: editor,
          displayNode: undefined,
          rootNode: root,
          nodesMarkdown: backlinks,
          setLocalSharedNodeMap: undefined,
          setLocalChildNodeMap: undefined
        })
      })
  }, [backlinks, editor]);

  return null;
}