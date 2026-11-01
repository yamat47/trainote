type IconProps = { name: string };

// Framework7 Icons are ligatures: the glyph is the name itself.
export function Icon({ name }: IconProps) {
  return (
    <i className="f7-icons" aria-hidden="true">
      {name}
    </i>
  );
}
