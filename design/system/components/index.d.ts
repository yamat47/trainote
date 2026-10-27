import type * as React from 'react';

export interface NavBarProps { title: string; trailing?: React.ReactNode; children?: React.ReactNode }
export declare function NavBar(props: NavBarProps): React.ReactElement;

export interface TabItem { key: string; label: string; icon: string; iconActive?: string }
export interface TabBarProps { items: TabItem[]; active: string; onChange?: (key: string) => void; label?: string }
export declare function TabBar(props: TabBarProps): React.ReactElement;

export interface RowProps { kind?: 'win' | 'slip'; tone?: 'tint'; mark?: React.ReactNode; sub?: React.ReactNode; detail?: React.ReactNode; accessory?: 'disclosure'; muted?: boolean; onClick?: () => void; children?: React.ReactNode }
export declare function Row(props: RowProps): React.ReactElement;

export interface WeekDay { label: string; wins?: number; slips?: number; today?: boolean }
export interface WeekProps { days: WeekDay[]; label?: string }
export declare function Week(props: WeekProps): React.ReactElement;

export interface GroupProps { header?: string; footer?: string; children?: React.ReactNode }
export declare function Group(props: GroupProps): React.ReactElement;

export interface FieldProps { label?: string; ariaLabel?: string; value?: string; defaultValue?: string; onChange?: (value: string) => void; placeholder?: string; multiline?: boolean; rows?: number; numeric?: boolean; unit?: string }
export declare function Field(props: FieldProps): React.ReactElement;

export interface MarkProps { kind: 'win' | 'slip' }
export declare function Mark(props: MarkProps): React.ReactElement;

export interface StatProps { value: React.ReactNode; unit?: string; label: string }
export declare function Stat(props: StatProps): React.ReactElement;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'prominent' | 'tinted' | 'plain' | 'destructive'; bold?: boolean; block?: boolean }
export declare function Button(props: ButtonProps): React.ReactElement;

export interface SegmentItem { key: string; label: string }
export interface SegmentedProps { items: SegmentItem[]; value: string; onChange?: (key: string) => void; label?: string }
export declare function Segmented(props: SegmentedProps): React.ReactElement;

export interface BubbleProps { from: 'me' | 'coach'; children?: React.ReactNode }
export declare function Bubble(props: BubbleProps): React.ReactElement;

declare global {
  interface Window {
    Trainote: {
      NavBar: typeof NavBar; TabBar: typeof TabBar; Row: typeof Row; Week: typeof Week; Group: typeof Group; Field: typeof Field;
      Mark: typeof Mark; Stat: typeof Stat; Button: typeof Button; Segmented: typeof Segmented; Bubble: typeof Bubble
    }
  }
}
