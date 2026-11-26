export const BRAND = {
  name: "Luxuriate Foodstuff",
  short: "Luxuriate",
  tagline: "Save monthly. Shop smart. Receive your foodstuff package.",
};

export const PERMISSIONS = [
  { key: "customers.view", label: "View customers", group: "Customers" },
  { key: "customers.edit", label: "Edit customer details", group: "Customers" },
  { key: "customers.cancel", label: "Cancel enrollments", group: "Customers" },
  { key: "payments.view", label: "View payments", group: "Payments" },
  { key: "payments.record", label: "Record offline payments", group: "Payments" },
  { key: "packages.manage", label: "Create and edit packages", group: "Packages" },
  { key: "procurement.view", label: "View procurement list", group: "Operations" },
  { key: "fulfilment.manage", label: "Update package status", group: "Operations" },
  { key: "savings.manage", label: "Mark savings returns paid", group: "Operations" },
  { key: "referrals.view", label: "View referrals", group: "Marketing" },
  { key: "emails.manage", label: "Edit and send emails", group: "Marketing" },
  { key: "reports.view", label: "View and download reports", group: "Reports" },
  { key: "activity.view", label: "View activity log", group: "Admin" },
  { key: "settings.manage", label: "Manage settings and collection points", group: "Admin" },
  { key: "staff.manage", label: "Manage staff accounts", group: "Admin" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_PRESETS: { key: string; label: string; description: string; permissions: Permission[] }[] = [
  {
    key: "viewer",
    label: "Viewer",
    description: "Can look at customers and payments, but not change anything.",
    permissions: ["customers.view", "payments.view", "reports.view"],
  },
  {
    key: "payments",
    label: "Payments clerk",
    description: "Follows up on payments and customer details.",
    permissions: ["customers.view", "customers.edit", "payments.view", "reports.view", "referrals.view"],
  },
  {
    key: "operations",
    label: "Operations",
    description: "Buys, packs and hands over packages.",
    permissions: ["customers.view", "procurement.view", "fulfilment.manage", "savings.manage"],
  },
  {
    key: "manager",
    label: "Manager",
    description: "Everything except staff accounts and offline payments.",
    permissions: [
      "customers.view", "customers.edit", "payments.view", "packages.manage", "procurement.view",
      "fulfilment.manage", "savings.manage", "referrals.view", "emails.manage", "reports.view", "activity.view",
      "settings.manage",
    ],
  },
];

export const FULFILMENT_STEPS = [
  { key: "preparing", label: "Preparing", description: "Buying and packing" },
  { key: "ready", label: "Ready", description: "Packed and waiting" },
  { key: "collection_scheduled", label: "Collection scheduled", description: "Date confirmed" },
  { key: "collected", label: "Collected", description: "Enjoy!" },
] as const;

export type FulfilmentStatus = "not_started" | (typeof FULFILMENT_STEPS)[number]["key"];

export const FULFILMENT_LABEL: Record<FulfilmentStatus, string> = {
  not_started: "Not started",
  preparing: "Preparing",
  ready: "Ready",
  collection_scheduled: "Collection scheduled",
  collected: "Collected",
};

export const ENROLLMENT_LABEL = {
  pending_payment: "Awaiting payment",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

export const INSTALLMENT_LABEL = {
  paid: "Paid",
  due: "Due",
  late: "Late",
  upcoming: "Upcoming",
  cancelled: "Cancelled",
} as const;

export const CHANNEL_LABEL: Record<string, string> = {
  card: "Card",
  bank: "Bank",
  bank_transfer: "Bank transfer",
  ussd: "USSD",
  qr: "QR",
  mobile_money: "Mobile money",
  dedicated_nuban: "Account transfer",
  offline: "Offline",
  test: "Test",
  apple_pay: "Apple Pay",
};

export const PACKAGE_THEMES = ["oat", "sage", "honey", "blush", "forest", "ink"] as const;
export type PackageTheme = (typeof PACKAGE_THEMES)[number];

export const THEME_STYLES: Record<PackageTheme, { card: string; chip: string; dot: string; dark: boolean; label: string }> = {
  oat: { card: "bg-cream", chip: "bg-sand text-ink-700", dot: "bg-honey-300", dark: false, label: "Oat" },
  sage: { card: "bg-forest-50", chip: "bg-forest-100 text-forest-800", dot: "bg-forest-300", dark: false, label: "Sage" },
  honey: { card: "bg-honey-50", chip: "bg-honey-100 text-honey-700", dot: "bg-honey-400", dark: false, label: "Honey" },
  blush: { card: "bg-blush-50", chip: "bg-blush-100 text-clay-700", dot: "bg-clay-300", dark: false, label: "Blush" },
  forest: { card: "bg-forest-800", chip: "bg-forest-700 text-forest-100", dot: "bg-honey-300", dark: true, label: "Forest" },
  ink: { card: "bg-ink-900", chip: "bg-ink-800 text-honey-200", dot: "bg-honey-400", dark: true, label: "Ink" },
};

export const PAGE_SIZE = 25;
