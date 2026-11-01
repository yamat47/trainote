// How a component's stories are framed, said once for both viewers: Storybook's
// decorator (.storybook/preview.tsx) and the card of the design-system artifact
// (scripts/project.ts). A story file sets it as `parameters.card` on its meta. A story
// may not carry a `render` or `decorators` of its own, since the card could not show them.
export type Card = {
  // Stories side by side (buttons, marks) or each as a 390px phone column; by default
  // they stack like a page.
  layout?: 'row' | 'phones';
  // The grouped page behind an inset group.
  background?: 'grouped';
  // The text size the stories are set in, when it is not the body's (icons).
  fontSize?: number;
  // A controlled component: the prop that holds its value and the one that reports a
  // change, so the story keeps state and can be used.
  controlled?: { value: string; onChange: string };
  // The artifact card's height and width in px; it grows to fit when omitted.
  height?: number;
  width?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function card(parameters: unknown, where: string): Card {
  const given: unknown = isRecord(parameters) ? parameters['card'] : undefined;
  const config: Card = {};
  if (given === undefined) return config;
  if (!isRecord(given)) throw new Error(`${where}: parameters.card is not an object`);
  for (const [key, value] of Object.entries(given)) {
    if ((key === 'height' || key === 'width' || key === 'fontSize') && typeof value === 'number') {
      config[key] = value;
    } else if (key === 'layout' && (value === 'row' || value === 'phones')) {
      config.layout = value;
    } else if (key === 'background' && value === 'grouped') {
      config.background = value;
    } else if (
      key === 'controlled' &&
      isRecord(value) &&
      typeof value['value'] === 'string' &&
      typeof value['onChange'] === 'string'
    ) {
      config.controlled = { value: value['value'], onChange: value['onChange'] };
    } else {
      throw new Error(`${where}: parameters.card.${key} is not a card setting`);
    }
  }
  return config;
}
