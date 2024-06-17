function getWikilinkRegexString(): string {
  const wikiLinkStartSequence = '\\[\\[';
  const wikiLinkEndSequence = '\]\]';

  // A wikilink looks like [[this]]
  // TODO check the inner text to make sure it's valid when
  // used as a filename or something
  const wikilink =
    '(' + wikiLinkStartSequence + ')' + 
    "([^\\[\\]]+)" + 
    '(' + wikiLinkEndSequence + ')';
    
  return wikilink;
}

export const WIKILINK_REGEX = new RegExp(getWikilinkRegexString(), 'i');
