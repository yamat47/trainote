// Generated from design/src by scripts/project.ts: the types of window.Trainote.
import type { ReactNode } from 'react';

// types.ts
export type EntryKind = 'win' | 'slip';

// Screen.tsx
type ScreenProps = {
    tone?: 'plain' | 'grouped';
    tabBar: ReactNode;
    children: ReactNode;
};
export declare function Screen({ tone, tabBar, children }: ScreenProps): import("react").JSX.Element;

// NavBar.tsx
type NavBarProps = {
    title: string;
    trailing?: ReactNode;
};
export declare function NavBar({ title, trailing }: NavBarProps): import("react").JSX.Element;

// TabBar.tsx
export type TabItem<Key extends string> = {
    key: Key;
    label: string;
    icon: string;
    iconActive: string;
};
type TabBarProps<Key extends string> = {
    items: readonly TabItem<Key>[];
    active: Key;
    onChange: (key: Key) => void;
    label?: string;
};
export declare function TabBar<Key extends string>({ items, active, onChange, label, }: TabBarProps<Key>): import("react").JSX.Element;

// ListHeader.tsx
type ListHeaderProps = {
    children: ReactNode;
};
export declare function ListHeader({ children }: ListHeaderProps): import("react").JSX.Element;

// List.tsx
type ListProps = {
    header?: string;
    children: ReactNode;
};
export declare function List({ header, children }: ListProps): import("react").JSX.Element;

// Inset.tsx
type InsetProps = {
    header?: string;
    children: ReactNode;
};
export declare function Inset({ header, children }: InsetProps): import("react").JSX.Element;

// Group.tsx
type GroupProps = {
    header?: string;
    footer?: ReactNode;
    children?: ReactNode;
};
export declare function Group({ header, footer, children }: GroupProps): import("react").JSX.Element;

// Row.tsx
type RowProps = {
    kind?: EntryKind;
    tone?: 'tint';
    sub?: ReactNode;
    error?: string | undefined;
    detail?: ReactNode;
    accessory?: 'disclosure';
    muted?: boolean;
    onClick?: () => void;
    children?: ReactNode;
};
export declare function Row({ kind, tone, sub, error, detail, accessory, muted, onClick, children, }: RowProps): import("react").JSX.Element;

// Mark.tsx
type MarkProps = {
    kind: EntryKind;
};
export declare function Mark({ kind }: MarkProps): import("react").JSX.Element;

// Text.tsx
type TextProps = {
    variant: 'footnote' | 'subheadline' | 'caption-1';
    tone?: 'secondary' | 'error';
    children: ReactNode;
};
export declare function Text({ variant, tone, children }: TextProps): import("react").JSX.Element;

// Field.tsx
type FieldProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    ariaLabel: string;
    maxLength?: number;
    disabled?: boolean;
};
export declare function Field({ value, onChange, placeholder, ariaLabel, maxLength, disabled, }: FieldProps): import("react").JSX.Element;

// Button.tsx
type ButtonProps = {
    variant?: 'plain' | 'prominent';
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
};
export declare function Button({ variant, disabled, onClick, children }: ButtonProps): import("react").JSX.Element;

// Actions.tsx
type ActionsProps = {
    align?: 'fill' | 'end';
    error?: string | undefined;
    children: ReactNode;
};
export declare function Actions({ align, error, children }: ActionsProps): import("react").JSX.Element;

// Week.tsx
export type WeekDay = {
    label: string;
    wins: number;
    slips: number;
    today: boolean;
};
type WeekProps = {
    days: WeekDay[];
    label?: string;
};
export declare function Week({ days, label }: WeekProps): import("react").JSX.Element;

// Icon.tsx
type IconProps = {
    name: string;
};
export declare function Icon({ name }: IconProps): import("react").JSX.Element;

declare global {
  interface Window {
    Trainote: {
      Screen: typeof Screen;
      NavBar: typeof NavBar;
      TabBar: typeof TabBar;
      ListHeader: typeof ListHeader;
      List: typeof List;
      Inset: typeof Inset;
      Group: typeof Group;
      Row: typeof Row;
      Mark: typeof Mark;
      Text: typeof Text;
      Field: typeof Field;
      Button: typeof Button;
      Actions: typeof Actions;
      Week: typeof Week;
      Icon: typeof Icon;
    };
  }
}
