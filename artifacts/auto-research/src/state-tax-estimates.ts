export type StateTaxEstimate = {
  code: string;
  name: string;
  rate: number;
};

// Illustrative prototype vehicle-purchase tax/levy approximations for defaults.
// Different motor-vehicle levies/caps and local rules are not fully modeled.
// These are not official claims or verified tax guidance; no local lookup is
// performed, and users should verify the applicable tax for their purchase.
export const STATE_TAX_ESTIMATES: StateTaxEstimate[] = [
  { code: "AL", name: "Alabama", rate: 2 },
  { code: "AK", name: "Alaska", rate: 0 },
  { code: "AZ", name: "Arizona", rate: 5.6 },
  { code: "AR", name: "Arkansas", rate: 6.5 },
  { code: "CA", name: "California", rate: 7.25 },
  { code: "CO", name: "Colorado", rate: 2.9 },
  { code: "CT", name: "Connecticut", rate: 6.35 },
  { code: "DE", name: "Delaware", rate: 4.25 },
  { code: "DC", name: "District of Columbia", rate: 6 },
  { code: "FL", name: "Florida", rate: 6 },
  { code: "GA", name: "Georgia", rate: 7 },
  { code: "HI", name: "Hawaii", rate: 4 },
  { code: "ID", name: "Idaho", rate: 6 },
  { code: "IL", name: "Illinois", rate: 6.25 },
  { code: "IN", name: "Indiana", rate: 7 },
  { code: "IA", name: "Iowa", rate: 5 },
  { code: "KS", name: "Kansas", rate: 6.5 },
  { code: "KY", name: "Kentucky", rate: 6 },
  { code: "LA", name: "Louisiana", rate: 5 },
  { code: "ME", name: "Maine", rate: 5.5 },
  { code: "MD", name: "Maryland", rate: 6.5 },
  { code: "MA", name: "Massachusetts", rate: 6.25 },
  { code: "MI", name: "Michigan", rate: 6 },
  { code: "MN", name: "Minnesota", rate: 6.875 },
  { code: "MS", name: "Mississippi", rate: 7 },
  { code: "MO", name: "Missouri", rate: 4.225 },
  { code: "MT", name: "Montana", rate: 0 },
  { code: "NE", name: "Nebraska", rate: 5.5 },
  { code: "NV", name: "Nevada", rate: 6.85 },
  { code: "NH", name: "New Hampshire", rate: 0 },
  { code: "NJ", name: "New Jersey", rate: 6.625 },
  { code: "NM", name: "New Mexico", rate: 4 },
  { code: "NY", name: "New York", rate: 4 },
  { code: "NC", name: "North Carolina", rate: 3 },
  { code: "ND", name: "North Dakota", rate: 5 },
  { code: "OH", name: "Ohio", rate: 5.75 },
  { code: "OK", name: "Oklahoma", rate: 3.25 },
  { code: "OR", name: "Oregon", rate: 0 },
  { code: "PA", name: "Pennsylvania", rate: 6 },
  { code: "RI", name: "Rhode Island", rate: 7 },
  { code: "SC", name: "South Carolina", rate: 6 },
  { code: "SD", name: "South Dakota", rate: 4 },
  { code: "TN", name: "Tennessee", rate: 7 },
  { code: "TX", name: "Texas", rate: 6.25 },
  { code: "UT", name: "Utah", rate: 4.85 },
  { code: "VT", name: "Vermont", rate: 6 },
  { code: "VA", name: "Virginia", rate: 4.3 },
  { code: "WA", name: "Washington", rate: 6.5 },
  { code: "WV", name: "West Virginia", rate: 6 },
  { code: "WI", name: "Wisconsin", rate: 5 },
  { code: "WY", name: "Wyoming", rate: 4 },
];