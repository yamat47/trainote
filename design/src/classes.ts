// The class names that apply, joined: a false or undefined part is a state that is off.
export const classes = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(' ');
