function getWikilinkRegexString(): string {
  const wikiLinkStartSequence = '\\[\\[';
  const wikiLinkEndSequence = '\\]\\]';

  // A wikilink looks like [[this]] or [[This]] or [[THIS]]
  // TODO check the inner text to make sure it's valid when used  as a filename or something
  const wikilink =
    '(' + wikiLinkStartSequence + ')' + 
    "([^\\[\\]]+)" + 
    '(' + wikiLinkEndSequence + ')';
    
  return wikilink;
}

export const WIKILINK_REGEX = new RegExp(getWikilinkRegexString(), 'i');
export const WIKILINK_REGEX_FOR_PAGES = new RegExp(getWikilinkRegexString(), 'gi');

export function extractWikilinks(text: string): string[] {
  const matches = text.match(WIKILINK_REGEX_FOR_PAGES);
  return matches ? matches.map(match => match.slice(2, -2)) : [];
}