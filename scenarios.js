const FAMILY_MAP = {
  H: {
    name: "Hearsay",
    subrules: [
      { code: "801(c)", name: "Hearsay definition" },
      { code: "801(d)(2)", name: "Party-opponent statement" },
      { code: "803(1)", name: "Present sense impression" },
      { code: "803(2)", name: "Excited utterance" },
      { code: "803(3)", name: "State of mind" },
      { code: "803(6)", name: "Business records" },
      { code: "804(b)(1)", name: "Former testimony" },
      { code: "805", name: "Hearsay within hearsay" }
    ]
  },
  R: {
    name: "Relevance",
    subrules: [
      { code: "401", name: "Test for relevance" },
      { code: "402", name: "Admissibility" }
    ]
  },
  P: {
    name: "403 / Prejudice",
    subrules: [
      { code: "403", name: "Unfair prejudice / confusion / waste" }
    ]
  },
  C: {
    name: "Character",
    subrules: [
      { code: "404(a)", name: "Character propensity" },
      { code: "404(b)", name: "Other acts" },
      { code: "405", name: "Methods of proving character" },
      { code: "406", name: "Habit" }
    ]
  },
  I: {
    name: "Impeachment",
    subrules: [
      { code: "608", name: "Character for truthfulness" },
      { code: "609", name: "Impeachment by conviction" },
      { code: "613", name: "Prior inconsistent statement" }
    ]
  },
  F: {
    name: "Foundation / Knowledge",
    subrules: [
      { code: "602", name: "Personal knowledge" },
      { code: "701", name: "Lay opinion" },
      { code: "702", name: "Expert testimony" }
    ]
  },
  L: {
    name: "Leading / Control",
    subrules: [
      { code: "611(c)", name: "Leading questions" }
    ]
  },
  S: {
    name: "Speculation / Opinion",
    subrules: [
      { code: "602", name: "Speculation/personal knowledge" },
      { code: "701", name: "Improper lay opinion" }
    ]
  },
  A: {
    name: "Authentication / Documents",
    subrules: [
      { code: "901", name: "Authentication" },
      { code: "902", name: "Self-authentication" },
      { code: "1002", name: "Best evidence" }
    ]
  },
  X: {
    name: "Exclusion / Privilege / Procedure",
    subrules: [
      { code: "105", name: "Limiting instruction" },
      { code: "106", name: "Rule of completeness" },
      { code: "103", name: "Rulings on evidence" }
    ]
  }
};

const SEED_SCENARIOS = [
  {
    text: "Direct exam. Witness: 'My neighbor told me the defendant confessed last week.' Offered for truth.",
    correctAction: "O",
    family: "H",
    subrule: "801(c)",
    explanation: "Out-of-court statement offered for truth. Hearsay unless exception applies."
  },
  {
    text: "Cross exam in negligence case. Defense asks plaintiff's witness: 'You saw the wet floor sign before you fell, correct?'",
    correctAction: "N",
    family: "L",
    subrule: "611(c)",
    explanation: "Leading is generally permitted on cross."
  },
  {
    text: "Prosecutor offers 10-year-old unrelated bar fight to prove defendant acted violently this time.",
    correctAction: "O",
    family: "C",
    subrule: "404(b)",
    explanation: "Propensity use of other acts is barred absent proper non-propensity purpose."
  },
  {
    text: "Witness estimates speed from what she personally observed at collision scene.",
    correctAction: "N",
    family: "F",
    subrule: "701",
    explanation: "Lay opinion based on perception can be admissible if helpful and non-technical."
  },
  {
    text: "A printout of accounting records is offered without custodian testimony or certification.",
    correctAction: "O",
    family: "A",
    subrule: "901",
    explanation: "Foundation/authentication is missing."
  }
];
