export type TabStripItem = { to: string; label: string; end?: boolean };

export interface TabStripProps {
  tabs: TabStripItem[];
}
