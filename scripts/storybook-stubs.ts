// What a story file imports from Storybook, for loading it outside Storybook
// (scripts/project.ts reads the stories' args): a handler the preview never calls.
export const fn = () => () => {};
