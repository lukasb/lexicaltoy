import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { KEY_DOWN_COMMAND, COMMAND_PRIORITY_LOW } from "lexical";

export default function MoveItemsPlugin(props: any) {
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