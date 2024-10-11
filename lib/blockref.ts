/*
  * A block reference is a string that looks like this:
  * "Some text ^some-block-id"
  */
export const BLOCK_ID_REGEX = /(\^[a-zA-Z0-9-]+)$/;
export const BLOCK_REFERENCE_REGEX = /#(\^[a-zA-Z0-9-]+)$/;
