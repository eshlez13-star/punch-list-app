export const STRUCTURES = [
  "1 - מתקן טיפול קדם",
  "2 - בריכת ויסות",
  "3 - חניון צפוני לבריכה",
  "4 - שטח משותף",
  "5 - עבודות פיתוח בדרך הגישה",
  "6 - עבודות מים",
  "7 - עבודות נוף וגינון",
];

export const RESPONSIBILITIES = [
  { value: "project_manager", label: "מנהל פרויקט" },
  { value: "contractor", label: "קבלן ראשי" },
  { value: "sub_contractor", label: "קבלן משנה" },
];

export const RESP_LABELS = {
  project_manager: "מנהל פרויקט",
  contractor: "קבלן ראשי",
  sub_contractor: "קבלן משנה",
};

export function createEmptyItem() {
  return {
    id: crypto.randomUUID(),
    structure: "",
    room: "",
    section: "",
    description: "",
    responsibility: "",
    image_original: null,
    image_marked: null,
    image_after_fix: null,
  };
}
