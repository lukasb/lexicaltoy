import React, {
  useState,
  useEffect,
  forwardRef,
  useCallback,
  useRef,
  createRef
} from "react";
import {
  BaseSelection,
  $isRangeSelection,
  $isTextNode,
  LexicalEditor,
  $getSelection,
  $getRoot,
  COMMAND_PRIORITY_CRITICAL,
  KEY_DOWN_COMMAND,
  LexicalCommand,
  EditorState,
} from "lexical";
import { $isListItemNode } from "@lexical/list";
import { $isAtNodeEnd } from "@lexical/selection";
import { FloatingMenuCoords, FloatingMenuProps } from ".";
import { isSmallWidthViewport } from "@/lib/window-helpers";
import { createDOMRange } from "@lexical/selection";
import { TodoCheckboxStatusNode, TodoStatus } from "@/_app/nodes/TodoNode";
import { 
  INSERT_DOING_TODO_COMMAND,
  INSERT_LATER_TODO_COMMAND,
  INSERT_NOW_TODO_COMMAND,
  INSERT_TODO_COMMAND,
  REMOVE_TODO_COMMAND
} from "@/lib/todo-commands";
import { URL_REGEX } from "../AutoLinkPlugin";
import { $isFormattableTextNode } from "@/_app/nodes/FormattableTextNode";

// TODO figure out actual line height instead of hardcoding 30
// this is copied from FloatingWikiPageNames.tsx should probably be shared
const editorLineHeight = 30;
const menuLineHeight = 40;
const mobileMaxHeight = 100;
const desktopMaxHeight = 400;

// TODO refactor these out somewhere

interface SlashCommand {
  shortName: string;
  description: string;
  command: LexicalCommand<BaseSelection>;
  shouldShow: (selection: BaseSelection) => boolean;
}

// Adjust the function to take an additional `baseStatus` parameter
const canCreateOrChangeTodo = (baseStatus: TodoStatus) => (selection: BaseSelection) => {
  if (!selection || !$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const node = selection.anchor.getNode().getParent();
  if ($isListItemNode(node)) { 
    const firstChild = node.getChildren()[0];
    if (firstChild instanceof TodoCheckboxStatusNode) {
      return firstChild.getStatus() !== baseStatus;
    } else {
      return true;
    }
  }
  return false;
};

const canRemoveTodo = (selection: BaseSelection) => {
  if (!selection || !$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const node = selection.anchor.getNode().getParent();
  return ($isListItemNode(node) && (node.getChildren()[0] instanceof TodoCheckboxStatusNode));
  return false;
}

const slashCommands = [
  {
    shortName: "TODO",
    description: "Create a new todo",
    command: INSERT_TODO_COMMAND,
    shouldShow: canCreateOrChangeTodo(TodoStatus.TODO)
  },
  {
    shortName: "DOING",
    description: "Create a new todo set to DOING",
    command: INSERT_DOING_TODO_COMMAND,
    shouldShow: canCreateOrChangeTodo(TodoStatus.DOING)
  },
  {
    shortName: "LATER",
    description: "Create a new todo set to LATER",
    command: INSERT_LATER_TODO_COMMAND,
    shouldShow: canCreateOrChangeTodo(TodoStatus.LATER)
  },
  {
    shortName: "NOW",
    description: "Create a new todo set to NOW",
    command: INSERT_NOW_TODO_COMMAND,
    shouldShow: canCreateOrChangeTodo(TodoStatus.NOW)
  },
  {
    shortName: "Remove",
    description: "Remove todo",
    command: REMOVE_TODO_COMMAND,
    shouldShow: canRemoveTodo
  }
];

function matchesCommandText(command: SlashCommand, searchText: string) {
  return command.shortName.toLowerCase().startsWith(searchText.toLowerCase());
}

export function shouldShowFloatingSlashCommands(selection: BaseSelection) {
  if (!selection || !$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const [hasMatch, match] = $search(selection);
  if (!hasMatch) return false;
  if (match.length === 0) return true;
  for (const command of slashCommands) {
    if (matchesCommandText(command, match) && command.shouldShow(selection)){
      return true;
    }
  }
  return false;
}

// tries to find "/slashcommand" before the cursor, within the current TextNode, based on valid slash commands
// returns [true, "slashcommand"] if it finds one
// TODO this doesn't actually search backwards from the cursor location, but it should
function $search(selection: null | BaseSelection): [boolean, string] {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return [false, ""];
  }
  const node = selection.getNodes()[0];
  const anchor = selection.anchor;
  // Check siblings?
  if (!$isTextNode(node) 
    || (!node.isSimpleText() && !$isFormattableTextNode(node))
    || !$isAtNodeEnd(anchor)) {
    return [false, ""];
  }
  const searchText = [];
  const text = node.getTextContent();
  
  let i = node.getTextContentSize();
  let c;
  while (i-- && i >= 0 && (c = text[i]) !== "/") {
    searchText.push(c);
  }
  if (i > 0 && text[i] === "/") {
    const WHITESPACE_REGEX = /\s/;
    let urlSearchText = searchText;
    let j = i;
    while (j-- && j >= 0 && !WHITESPACE_REGEX.test(text[j])) {
      urlSearchText.push(text[j]);
    }
    if (urlSearchText.length > 0 && URL_REGEX.test(urlSearchText.join(""))) {
      return [false, ""];
    }
  }
  // just a slash works
  if (text[i] === "/" && searchText.length === 0) {
    return [true, ""];
  }
  // otherwise, we should have some text to search
  if (searchText.length === 0) {
    return [false, ""];
  }
  // if we didn't find a slash, don't search
  if (i < 1 && text[i] !== "/") {
    return [false, ""];
  }
  return [true, searchText.reverse().join("")];
}

// TODO duplicate code from FloatingWikiPageNames.tsx, refactor to share
export function computeFloatingSlashCommandsPosition(
  editor: LexicalEditor,
  selection: BaseSelection,
  ref: React.RefObject<HTMLElement> | null
): FloatingMenuCoords {
  const position = computeFloatingSlashCommandsPositionInternal(editor);
  if (!position) return { x: 0, y: 0 };
  const {cursorLeft, cursorTop, rootX, rootY} = position;
  return {
    x: cursorLeft - rootX,
    y: cursorTop - rootY + editorLineHeight
  };
}

// TODO duplicate code from FloatingWikiPageNames.tsx, refactor to share
function computeFloatingSlashCommandsPositionInternal(editor: LexicalEditor) {
  // lexical selections don't let you get a range?
  const theSelection = window.getSelection();
  const range = theSelection?.getRangeAt(0);
  const rect = range?.getBoundingClientRect();

  const editorState = editor.getEditorState();
  let startX = 0;
  let startY = 0;
  editorState.read(() => {
    const node = $getRoot();
    const dom = editor.getElementByKey(node.__key);
    startX = dom?.getBoundingClientRect().left || 0;
    startY = dom?.getBoundingClientRect().top || 0;
  });
  if (!rect) return;

  return {
    cursorLeft: rect.left,
    cursorTop: rect.top,
    rootX: startX,
    rootY: startY 
  };
}

const FloatingSlashCommands = forwardRef<HTMLDivElement, FloatingMenuProps>(
  ({ editor, coords }, ref) => {
    const [commands, setCommands] = useState<SlashCommand[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cancelled, setCancelled] = useState(false);
    const [position, setPosition] = useState({top: coords?.y, left: coords?.x});

    const shouldShow = coords !== undefined;

    const itemRefs = useRef<(React.RefObject<HTMLLIElement> | null)[]>([]);

    const resetSelf = useCallback(() => {
      setCommands([]);
      setSelectedIndex(-1);
    }, []);

    useEffect(() => {
      itemRefs.current = commands.map((_, i) =>
        itemRefs.current[i] ?? createRef<HTMLLIElement>()
      );
    }, [commands]);

    useEffect(() => {
      if (commands.length > 0) {
        if (!editor) return;
        const positionVars = computeFloatingSlashCommandsPositionInternal(editor);
        if (!positionVars) return;
        let newHeight = 0;
        let newTop = 0;
        // TODO well this sorta works to figure out the height ...
        if (isSmallWidthViewport(768)) {
          newHeight = Math.min(commands.length * menuLineHeight, mobileMaxHeight);
        } else {
          newHeight = Math.min(commands.length * menuLineHeight, desktopMaxHeight);
        }
        const spaceBelow = window.innerHeight - positionVars.cursorTop - window.scrollY;
        if (spaceBelow < newHeight) {
          newTop = positionVars.cursorTop - positionVars.rootY - newHeight - 10;
        } else {
          newTop = positionVars.cursorTop - positionVars.rootY + editorLineHeight;
        }
        setPosition({top: newTop, left: position.left});
      }
    }, [commands, editor, position.left, position.top]);

    // Scroll the selected item into view when selectedIndex changes
    useEffect(() => {
      const selectedItemRef = itemRefs.current[selectedIndex];
      if (selectedItemRef?.current) {
        selectedItemRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, [selectedIndex]);

    const handleSelectCommand = useCallback((command: SlashCommand) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!selection || !$isRangeSelection(selection) || !selection.isCollapsed()) return;
        const [hasMatch, match] = $search(selection);
        if (!hasMatch) return;

        const {anchor, focus} = selection;
        // TODO handle case where beginning of wiki page name is before the node the selection is in
        const newAnchorOffset = Math.max(anchor.offset - (match.length + 1), 0);
        const range = createDOMRange(
          editor,
          anchor.getNode(),
          newAnchorOffset,
          focus.getNode(),
          focus.offset,
        );
        if (range) {
          selection.applyDOMRange(range);
          selection.removeText();
        }
        
        editor.dispatchCommand(command.command, selection);

        resetSelf();
      });
    }, [editor, resetSelf]);

    const filterSlashCommands = useCallback((editorState: EditorState) => {
      editorState.read(() => {
        const selection = $getSelection();
        const [hasMatch, match] = $search(selection);
        if (!hasMatch || !selection) {
          resetSelf();
          return;
        }
        if (match.length === 0) {
          setCommands(slashCommands.filter((command) => command.shouldShow(selection)));
        } else {
          const filteredCommands = slashCommands.filter(
            (command) =>
              matchesCommandText(command, match) &&
              command.shouldShow(selection)
          );
          setCommands(filteredCommands);
        }
      });
    }, [resetSelf]);

    useEffect(() => {
      const editorState = editor.getEditorState();
      filterSlashCommands(editorState);  
    }, [editor, filterSlashCommands]);

    useEffect(() => {
      const unregisterListener = editor.registerUpdateListener(
        ({ editorState }) => {
          filterSlashCommands(editorState);
        }
      );
      return unregisterListener;
    }, [editor, commands, resetSelf, filterSlashCommands]);

    // we're doing this to memoize state (results, shouldShow etc)
    // component was being mounted twice and the second time it didn't have the right state
    // TODO figure out why

    const command = useCallback((keyboardEvent: React.KeyboardEvent, editor: LexicalEditor) => {
      if (keyboardEvent.key === "ArrowDown") {
        if (!shouldShow || cancelled) return false;
        keyboardEvent.preventDefault();
        setSelectedIndex((prevIndex) =>
          Math.min(prevIndex + 1, commands.length - 1)
        );
        return true;
      } else if (keyboardEvent.key === "ArrowUp") {
        if (!shouldShow || cancelled) return false;
        keyboardEvent.preventDefault();
        setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        return true;
      } else if (keyboardEvent.key === "Enter") {
        if (!shouldShow || cancelled) return false;
        if (selectedIndex > -1 && commands.length > 0) {
          keyboardEvent.preventDefault();
          handleSelectCommand(commands[selectedIndex]);
          resetSelf();
          return true;
        }
        return false;
      } else if (keyboardEvent.key === "Escape") {
        if (!shouldShow || cancelled) return false;
        setCancelled(true);
        resetSelf();
        return true;
      }
      return false;
    }, [shouldShow, commands, selectedIndex, handleSelectCommand, resetSelf, cancelled]);
    
    useEffect(() => {
      if (!editor) return () => undefined;
      return editor.registerCommand(
        KEY_DOWN_COMMAND,
        command,
        COMMAND_PRIORITY_CRITICAL
      );
    }, [editor, command]);

    // TODO don't hardcode max heights below
    return (
      <div
        ref={ref}
        className="absolute z-40 bg-white shadow-md rounded-md border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        aria-hidden={!shouldShow}
        style={{
          position: "absolute",
          top: position.top ? position.top : coords?.y,
          left: position.left ? position.left: coords?.x,
          visibility: shouldShow ? "visible" : "hidden",
          opacity: shouldShow ? 1 : 0,
        }}
      >
        <ul className="max-h-[100px] md:max-h-[400px] overflow-auto">
          {commands.map((command, index) => (
            <li
              key={index}
              ref={itemRefs.current[index]}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                selectedIndex === index
                  ? "selected-item bg-gray-200 dark:bg-gray-700"
                  : ""
              }`}
              onClick={() => handleSelectCommand(command)}
            >
              {command.shortName} <span className="text-gray-400 ml-2">{command.description}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
);

FloatingSlashCommands.displayName = "FloatingSlashCommands";
export default FloatingSlashCommands;
