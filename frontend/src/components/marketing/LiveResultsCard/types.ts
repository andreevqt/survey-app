export type PollOption = { t: string; pct: number };

export type Poll = {
  q: string;
  responses: number;
  options: readonly PollOption[];
};

export type LiveResultsCardProps = {
  rotate?: number;
  opacity?: number;
  zIndex?: number;
  offset?: { x: number; y: number };
  delay?: number;
};
