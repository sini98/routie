export type TransportMode = "walk" | "transit" | "car";

export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  walk: "도보",
  transit: "대중교통",
  car: "자동차",
};
