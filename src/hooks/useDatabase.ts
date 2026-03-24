"use client";

import { useEffect, useState } from "react";
import { DB_KEY, createSeedDatabase, defaultSubjectNames, type Database } from "~/lib/db";

const roleSuffix: Record<Database["users"][number]["role"], string> = {
  ADMIN: "@admin",
  COUNCILOR: "@conci",
  TEACHER: "@edu",
};

const normalizeUsers = (db: Database): Database => {
  const normalized = db.users.map((user) => {
    const current = user.username.toLowerCase();
    const assignedSubjects =
      user.role === "TEACHER"
        ? (user.assignedSubjects?.map((subject) => subject.trim()).filter(Boolean) ?? [])
        : undefined;

    if (
      current.endsWith("@admin") ||
      current.endsWith("@conci") ||
      current.endsWith("@edu")
    ) {
      return { ...user, username: current, assignedSubjects };
    }

    return {
      ...user,
      username: `${current}${roleSuffix[user.role]}`,
      assignedSubjects,
    };
  });

  const seed = createSeedDatabase();
  const admin =
    normalized.find((user) => user.role === "ADMIN") ??
    seed.users.find((user) => user.role === "ADMIN");
  const councilor =
    normalized.find((user) => user.role === "COUNCILOR") ??
    seed.users.find((user) => user.role === "COUNCILOR");
  const existingTeachers = normalized.filter((user) => user.role === "TEACHER");
  const fallbackTeacher = seed.users.find((user) => user.role === "TEACHER");
  const primaryTeacher =
    (existingTeachers[0]
      ? {
          ...existingTeachers[0],
          username: "edu@edu",
          password: "edu123",
          assignedSubjects: [...defaultSubjectNames],
        }
      : fallbackTeacher)
      ?? null;

  const teacherId = primaryTeacher?.id ?? null;

  const nextSections = db.sections.map((section) => {
    if (!teacherId) return section;
    if (!section.teacherId) return section;
    return { ...section, teacherId };
  });

  const nextStudents = db.students.map((student) => {
    if (!teacherId) return student;
    if (!student.assignment.teacherId) return student;
    return {
      ...student,
      assignment: {
        ...student.assignment,
        teacherId,
      },
    };
  });

  return {
    ...db,
    users: [admin, councilor, primaryTeacher].filter(
      (user): user is Database["users"][number] => Boolean(user),
    ),
    sections: nextSections,
    students: nextStudents,
  };
};

const stripStudentImages = (db: Database) => {
  let removedCount = 0;

  const students = db.students.map((student) => {
    if (!student.imageUrl) return student;
    removedCount += 1;
    return { ...student, imageUrl: undefined };
  });

  return {
    nextDb: { ...db, students },
    removedCount,
  };
};

export function useDatabase() {
  const [db, setDb] = useState<Database | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Database;
        setDb(normalizeUsers(parsed));
        return;
      } catch {
        localStorage.removeItem(DB_KEY);
      }
    }
    const seeded = createSeedDatabase();
    setDb(seeded);
  }, []);

  useEffect(() => {
    if (!db) return;
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (error) {
      const { nextDb, removedCount } = stripStudentImages(db);

      // If quota is exceeded, fallback to a reduced payload without embedded images.
      if (removedCount > 0) {
        try {
          localStorage.setItem(DB_KEY, JSON.stringify(nextDb));
          setDb(nextDb);
          return;
        } catch {
          // Fall through and log below.
        }
      }

      console.error("Failed to persist localStorage database", error);
    }
  }, [db]);

  const updateDatabase = (updater: (current: Database) => Database) => {
    setDb((current) => {
      if (!current) return current;
      return updater(current);
    });
  };

  return { db, updateDatabase };
}
