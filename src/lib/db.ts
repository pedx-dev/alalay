export type RoleShortcut = "@admin" | "@edu" | "@conci";
export type UserRole = "ADMIN" | "TEACHER" | "COUNCILOR";
export type Status = "ACTIVE" | "DISABLED" | "DROPOUT";
export type StudentModalTab = "PROFILE" | "ASSIGNMENT" | "GRADES" | "LOGS";

export type User = {
  id: string;
  fullName: string;
  username: string;
  password: string;
  role: UserRole;
  shortcut: RoleShortcut;
  status: Status;
  assignedSubjects?: string[];
};

export type StudentProfile = {
  age: number;
  guardian: string;
  contact: string;
  program: string;
  yearLevel: string;
};

export type SubjectGrade = {
  name: string;
  prelim: string;
  midterm: string;
  finals: string;
};

export const defaultSubjectNames = [
  "Core Math",
  "Communication",
  "Systems Design",
  "Computer Programming",
  "Data Structures",
  "Database Systems",
  "Networking",
  "Web Development",
  "Ethics",
] as const;

export const createDefaultSubjectGrades = (): SubjectGrade[] =>
  defaultSubjectNames.map((name) => ({
    name,
    prelim: "",
    midterm: "",
    finals: "",
  }));

export type Student = {
  id: string;
  studentNumber: string;
  fullName: string;
  imageUrl?: string;
  status: Status;
  profile: StudentProfile;
  assignment: {
    teacherId: string | null;
    sectionId: string | null;
  };
  grades: {
    coreMath: string;
    communication: string;
    systemsDesign: string;
    subjects?: SubjectGrade[];
  };
  logs: string[];
};

export const toNumericGrade = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const normalizeSubjectGrades = (student: Student): SubjectGrade[] => {
  const defaults = createDefaultSubjectGrades();
  const existing = student.grades.subjects;

  if (existing && existing.length > 0) {
    return defaults.map((entry, index) => {
      const current = existing[index];
      return {
        name: current?.name || entry.name,
        prelim: current?.prelim ?? "",
        midterm: current?.midterm ?? "",
        finals: current?.finals ?? "",
      };
    });
  }

  return defaults.map((entry, index) => {
    if (index > 0) return entry;
    return {
      ...entry,
      prelim: student.grades.coreMath,
      midterm: student.grades.communication,
      finals: student.grades.systemsDesign,
    };
  });
};

export const computeTermGwa = (subject: SubjectGrade) => {
  const values = [
    toNumericGrade(subject.prelim),
    toNumericGrade(subject.midterm),
    toNumericGrade(subject.finals),
  ].filter((entry): entry is number => entry !== null);

  if (values.length === 0) return "N/A";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2);
};

export const computeOverallGwa = (subjects: SubjectGrade[]) => {
  const values = subjects
    .flatMap((subject) => [
      toNumericGrade(subject.prelim),
      toNumericGrade(subject.midterm),
      toNumericGrade(subject.finals),
    ])
    .filter((entry): entry is number => entry !== null);

  if (values.length === 0) return "N/A";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2);
};

export type Section = {
  id: string;
  name: string;
  teacherId: string | null;
  studentIds: string[];
};

export type SystemLog = {
  id: string;
  actor: RoleShortcut;
  action: string;
  createdAt: string;
};

export type Database = {
  users: User[];
  students: Student[];
  sections: Section[];
  systemLogs: SystemLog[];
};

export const DB_KEY = "alalay_db";
export const SESSION_USER_ID_KEY = "alalay_session_user_id";
export const SESSION_USER_ROLE_KEY = "alalay_session_user_role";

const sectionNames = [
  "BSIT - 1ST YR A",
  "BSIT - 1ST YR B",
  "BSIT - 2ND YR A",
  "BSIT - 2ND YR B",
  "BSIT - 3RD YR A",
  "BSIT - 3RD YR B",
  "BSIT - 4TH YR A",
  "BSIT - 4TH YR B",
  "BSEDUC - 1ST YR",
  "BSEDUC - 2ND YR",
  "BSEDUC - 3RD YR",
  "BSEDUC - 4TH YR",
  "BSBA - 1ST YR",
  "BSBA - 2ND YR",
  "BSBA - 3RD YR",
  "BSBA - 4TH YR",
];

export const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createSeedDatabase = (): Database => {
  const adminId = "usr-admin-001";
  const councilorId = "usr-councilor-001";
  const teacherIds = defaultSubjectNames.map((_, index) =>
    `usr-teacher-${(index + 1).toString().padStart(3, "0")}`,
  );
  const leadTeacherId = teacherIds[0] ?? null;

  const sections = sectionNames.map((name, index) => ({
    id: `sec-${(index + 1).toString().padStart(2, "0")}`,
    name,
    teacherId: index < 4 ? leadTeacherId : null,
    studentIds: [] as string[],
  }));

  const students: Student[] = [
    {
      id: "stud-001",
      studentNumber: "2026-1001",
      fullName: "Alyssa Dela Cruz",
      status: "ACTIVE",
      profile: {
        age: 20,
        guardian: "Marissa Dela Cruz",
        contact: "0912-345-6789",
        program: "BSIT",
        yearLevel: "3RD YR",
      },
      assignment: { teacherId: leadTeacherId, sectionId: sections[4]?.id ?? null },
      grades: {
        coreMath: "91",
        communication: "89",
        systemsDesign: "93",
        subjects: [
          {
            name: "Core Math",
            prelim: "91",
            midterm: "89",
            finals: "93",
          },
          ...createDefaultSubjectGrades().slice(1),
        ],
      },
      logs: ["Orientation completed"],
    },
    {
      id: "stud-002",
      studentNumber: "2026-1002",
      fullName: "Rico Santos",
      status: "ACTIVE",
      profile: {
        age: 19,
        guardian: "Liza Santos",
        contact: "0911-098-7654",
        program: "BSIT",
        yearLevel: "3RD YR",
      },
      assignment: { teacherId: leadTeacherId, sectionId: sections[4]?.id ?? null },
      grades: {
        coreMath: "",
        communication: "",
        systemsDesign: "",
        subjects: createDefaultSubjectGrades(),
      },
      logs: ["Needs follow-up on attendance"],
    },
    {
      id: "stud-003",
      studentNumber: "2026-1003",
      fullName: "Bianca Mateo",
      status: "ACTIVE",
      profile: {
        age: 20,
        guardian: "Rene Mateo",
        contact: "0922-777-1100",
        program: "BSEDUC",
        yearLevel: "2ND YR",
      },
      assignment: { teacherId: leadTeacherId, sectionId: sections[9]?.id ?? null },
      grades: {
        coreMath: "87",
        communication: "95",
        systemsDesign: "88",
        subjects: [
          {
            name: "Core Math",
            prelim: "87",
            midterm: "95",
            finals: "88",
          },
          ...createDefaultSubjectGrades().slice(1),
        ],
      },
      logs: ["Transferred section last semester"],
    },
  ];

  for (const student of students) {
    if (!student.assignment.sectionId) continue;
    const section = sections.find(
      (entry) => entry.id === student.assignment.sectionId,
    );
    section?.studentIds.push(student.id);
  }

  return {
    users: [
      {
        id: adminId,
        fullName: "Mara Administrator",
        username: "admin@admin",
        password: "admin123",
        role: "ADMIN",
        shortcut: "@admin",
        status: "ACTIVE",
      },
      ...defaultSubjectNames.map((subject, index) => {
        const id = teacherIds[index] ?? `usr-teacher-${(index + 1).toString().padStart(3, "0")}`;
        const slug = subject
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .trim()
          .replace(/\s+/g, ".");

        return {
          id,
          fullName: `${subject} Teacher`,
          username: `${slug}@edu`,
          password: "edu123",
          role: "TEACHER" as const,
          shortcut: "@edu" as const,
          status: "ACTIVE" as const,
          assignedSubjects: [subject],
        };
      }),
      {
        id: councilorId,
        fullName: "Connie Villanueva",
        username: "conci@conci",
        password: "conci123",
        role: "COUNCILOR",
        shortcut: "@conci",
        status: "ACTIVE",
      },
    ],
    students,
    sections,
    systemLogs: [
      {
        id: makeId(),
        actor: "@admin",
        action: "Prototype database initialized in localStorage",
        createdAt: new Date().toISOString(),
      },
    ],
  };
};

export const roleLabel: Record<UserRole, string> = {
  ADMIN: "Admin",
  COUNCILOR: "Councilor",
  TEACHER: "Teacher",
};

export const shortcutByRole: Record<UserRole, RoleShortcut> = {
  ADMIN: "@admin",
  COUNCILOR: "@conci",
  TEACHER: "@edu",
};

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const appendLog = (
  actor: RoleShortcut,
  action: string,
  nextDb: Database,
): Database => ({
  ...nextDb,
  systemLogs: [
    {
      id: makeId(),
      actor,
      action,
      createdAt: new Date().toISOString(),
    },
    ...nextDb.systemLogs,
  ],
});
