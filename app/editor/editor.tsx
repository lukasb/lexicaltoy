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
import { CustomTabIndentationPlugin } from '../plugins/CustomTabIndentationPlugin';
import DraggableBlockPlugin from '../plugins/DraggableBlockPlugin';
import {KEY_DOWN_COMMAND, COMMAND_PRIORITY_LOW, $getRoot, $createTextNode} from 'lexical';

const theme = {
    blockCursor: 'PlaygroundEditorTheme__blockCursor',
    heading: {
        h1: 'PlaygroundEditorTheme__h1',
        h2: 'PlaygroundEditorTheme__h2',
        h3: 'PlaygroundEditorTheme__h3',
        h4: 'PlaygroundEditorTheme__h4',
        h5: 'PlaygroundEditorTheme__h5',
        h6: 'PlaygroundEditorTheme__h6',
    },
    indent: 'PlaygroundEditorTheme__indent',
    list: {
        listitem: 'PlaygroundEditorTheme__listItem',
        nested: {
          listitem: 'PlaygroundEditorTheme__nestedListItem',
        },
        ul: 'PlaygroundEditorTheme__ul',
      }
}

function OnChangePlugin({ onChange }: { onChange: (editorState: EditorState) => void }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            onChange(editorState);
        });
    }, [editor, onChange]);
    return null;
}

function MoveItemsPlugin(props: any) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        const removeListener = editor.registerCommand(KEY_DOWN_COMMAND, (event: KeyboardEvent) => {
            if (event.key == 'ArrowDown' && event.ctrlKey) {
                console.log("ctrl+downarrow");
            } else if (event.key == 'ArrowUp' && event.ctrlKey) {
                console.log("ctrl+uparrow");
            }
            return false;
        }, COMMAND_PRIORITY_LOW);

        return () => {
            removeListener();
        };
    }, [editor]);

    return null;
}

function onError(error: Error) {
    console.error(error);
}

function Editor({initialPageContent}: {initialPageContent: string}) {
    
    const initialConfig = {
        editorState: initialPageContent,
        namespace: 'MyEditor',
        theme,
        nodes: [LinkNode, ListNode, ListItemNode],
        onError
    }

    const [floatingAnchorElem, setFloatingAnchorElem] =
        useState<HTMLDivElement | null>(null);

    const onRef = (_floatingAnchorElem: HTMLDivElement) => {
        if (_floatingAnchorElem !== null) {
            setFloatingAnchorElem(_floatingAnchorElem);
        }
    };
        
    const [editorState, setEditorState] = useState<any>(null);

    function onChange(editorState: EditorState) {
        if (!editorState) return;
        const editorStateJSON = editorState.toJSON();
        const editorStateJSONString = JSON.stringify(editorStateJSON);
        setEditorState(editorStateJSONString);
        console.log(editorStateJSONString);
    }

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <AutoFocusPlugin />
            <RichTextPlugin
                contentEditable={
                    <div ref={onRef} className="relative">
                        <ContentEditable className='w-full h-96 outline-none' />
                    </div>
                }
                // absolute positioning is the Lexical team's official recommendation for placeholders
                placeholder={<div className='absolute top-10 left-10'>Start typing here...</div>} 
                ErrorBoundary={LexicalErrorBoundary}
            />
            <ListPlugin />
            <OnChangePlugin onChange={onChange} />
            <MarkdownShortcutPlugin transformers={[UNORDERED_LIST]} />
            <CustomTabIndentationPlugin />
            <MoveItemsPlugin />
            {floatingAnchorElem && (
                <>
                    <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                </>
            )}
        </LexicalComposer>
    )
}

export default Editor;