<NodeEventPlugin
nodeType={...}
eventType="click"
eventListener={(event: Event, editor: LexicalEditor, nodeKey: string) => {
  editor.update(() => {
    const node = $getNodeByKey(nodeKey);

    if ($isSomeNode(node)) {
      event.preventDefault();
      editor.dispatchCommand(...);
    }
  });
}}
/>