'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import React, { useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import type { EditorState } from 'lexical';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { ListNode, ListItemNode, $createListNode, $createListItemNode } from '@lexical/list';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { UNORDERED_LIST } from '@lexical/markdown';
import { LinkNode } from '@lexical/link'
import { KeyboardShortcutsPlugin } from '../plugins/KeyboardShortcutsPlugin';
import DraggableBlockPlugin from '../plugins/DraggableBlockPlugin';
import { useDebouncedCallback } from 'use-debounce';
import { updatePageContents } from '../lib/actions';
import { theme } from './editor-theme';
import { FloatingMenuPlugin } from '../plugins/FloatingMenuPlugin';
import { useBreakpoint } from '../lib/window-helpers';
import { ListCommandsPlugin } from '../plugins/ListCommandsPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';

function OnChangePlugin({ onChange }: { onChange: (editorState: EditorState) => void }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            onChange(editorState);
        });
    }, [editor, onChange]);
    return null;
}

function onError(error: Error) {
    console.error(error);
}

function Editor({initialPageContent, pageId, userId}: {initialPageContent: string, pageId: string, userId: string}) {
    
    const initialConfig = {
        editorState: initialPageContent,
        namespace: 'MyEditor',
        theme,
        nodes: [LinkNode, ListNode, ListItemNode],
        onError
    }

    const [floatingAnchorElem, setFloatingAnchorElem] =
        useState<HTMLDivElement | null>(null);

    const [isSmallWidthViewport, setIsSmallWidthViewport] =
        useState<boolean>(false);

    useBreakpoint(768, isSmallWidthViewport, setIsSmallWidthViewport);

    const onRef = (_floatingAnchorElem: HTMLDivElement) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem);
        }
    };
        
    const [editorState, setEditorState] = useState<any>(null);

    const storePage = useDebouncedCallback((outline) => {
        console.log(`Storing page`);
        updatePageContents(pageId, outline);
      }, 500);

    function onChange(editorState: EditorState) {
        if (!editorState) return;
        const editorStateJSONString = JSON.stringify(editorState);
        storePage(editorStateJSONString);
    }
    
    return (
        <LexicalComposer initialConfig={initialConfig}>
            <AutoFocusPlugin />
            <RichTextPlugin
                contentEditable={
                    <div ref={onRef} className="relative">
                        <ContentEditable className='w-full outline-none' />
                    </div>
                }
                // absolute positioning is the Lexical team's official recommendation for placeholders
                placeholder={<div className='absolute top-10 left-10'>Start typing here...</div>} 
                ErrorBoundary={LexicalErrorBoundary}
            />
            <ListPlugin />
            <OnChangePlugin onChange={onChange} />
            <MarkdownShortcutPlugin transformers={[UNORDERED_LIST]} />
            <KeyboardShortcutsPlugin />
            <ListCommandsPlugin />
            <HistoryPlugin />
            {floatingAnchorElem && !isSmallWidthViewport && (
                <>
                    <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                </>
            )}
            {floatingAnchorElem && isSmallWidthViewport && (
                <>
                    <FloatingMenuPlugin anchorElem={floatingAnchorElem} /> 
                </>
            )}
        </LexicalComposer>
    )
}

export default Editor;