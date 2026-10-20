const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconHome = () => (
  <svg {...base}>
    <path d="M3 11.5 12 4l9 7.5V19a2 2 0 0 1-2 2h-3.5v-6h-7v6H5a2 2 0 0 1-2-2z" />
  </svg>
);

export const IconPlan = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </svg>
);

export const IconProgress = () => (
  <svg {...base}>
    <path d="M5 20v-7M12 20V5M19 20v-10" />
  </svg>
);

export const IconShoe = () => (
  <svg {...base}>
    <path d="M3 16.5V9l4 1.2c1 .3 1.6 1.2 2.4 1.9.8.7 1.8 1 2.9 1H17c2.2 0 4 1.8 4 4v.4z" />
    <path d="M3 19.5h18" />
  </svg>
);

export const IconRefresh = () => (
  <svg {...base} width={20} height={20}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </svg>
);

export const IconPlay = () => (
  <svg {...base} width={20} height={20} fill="currentColor" stroke="none">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
  </svg>
);
