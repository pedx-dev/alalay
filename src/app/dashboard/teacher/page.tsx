"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  appendLog,
  computeOverallGwa,
  computeTermGwa,
  normalizeSubjectGrades,
  SESSION_USER_ID_KEY,
  type Section,
  type Student,
  type SubjectGrade,
} from "~/lib/db";
import { useDatabase } from "~/hooks/useDatabase";

const parseSectionMeta = (name: string) => {
  const [course = "", rest = ""] = name.split(" - ");
  const blockRegex = /\b([A-Z])$/;
  const blockMatch = blockRegex.exec(rest);
  const block = blockMatch?.[1] ?? "";
  const yearSection = rest.replace(/\s+[A-Z]$/, "").trim();
  return { course, yearSection, block };
};

export default function TeacherDashboard() {
  const { db, updateDatabase } = useDatabase();

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [blockFilter, setBlockFilter] = useState("ALL");
  const [gradeDraft, setGradeDraft] = useState<SubjectGrade[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  useEffect(() => {
    setSessionUserId(localStorage.getItem(SESSION_USER_ID_KEY));
  }, []);

  const activeTeacher = useMemo(
    () => {
      if (!db) return null;
      const sessionTeacher = db.users.find(
        (u) => u.role === "TEACHER" && u.status === "ACTIVE" && sessionUserId && u.id === sessionUserId,
      );
      if (sessionTeacher) return sessionTeacher;
      return db.users.find((u) => u.role === "TEACHER" && u.status === "ACTIVE") ?? null;
    },
    [db, sessionUserId],
  );

  const visibleSections = useMemo(
    () =>
      db?.sections.filter((section) =>
        section.studentIds.some((id) => db.students.find((student) => student.id === id)?.status === "ACTIVE"),
      ) ?? [],
    [db],
  );

  const editableSubjects = useMemo(() => activeTeacher?.assignedSubjects ?? [], [activeTeacher]);

  const studentsById = useMemo(() => new Map(db?.students.map((s) => [s.id, s]) ?? []), [db]);

  const selectedSection = useMemo(
    () => db?.sections.find((section) => section.id === selectedSectionId) ?? null,
    [db, selectedSectionId],
  );

  const selectedStudent = useMemo(
    () => db?.students.find((s) => s.id === selectedStudentId) ?? null,
    [db, selectedStudentId],
  );

  useEffect(() => {
    if (!selectedStudent) return;
    setGradeDraft(normalizeSubjectGrades(selectedStudent));
  }, [selectedStudent]);

  if (!db) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p className="text-lg text-slate-600">Loading workspace...</p>
      </main>
    );
  }

  const getActiveStudents = (section: Section): Student[] =>
    section.studentIds
      .map((id) => studentsById.get(id))
      .filter((s): s is Student => s?.status === "ACTIVE");

  const allCourses = Array.from(
    new Set(visibleSections.map((section) => parseSectionMeta(section.name).course)),
  ).filter(Boolean);

  const allYears = Array.from(
    new Set(visibleSections.map((section) => parseSectionMeta(section.name).yearSection)),
  ).filter(Boolean);

  const allBlocks = Array.from(
    new Set(visibleSections.map((section) => parseSectionMeta(section.name).block)),
  ).filter(Boolean);

  const filteredSections = visibleSections.filter((section) => {
    const meta = parseSectionMeta(section.name);
    const passCourse = courseFilter === "ALL" || meta.course === courseFilter;
    const passYear = yearFilter === "ALL" || meta.yearSection === yearFilter;
    const passBlock = blockFilter === "ALL" || meta.block === blockFilter;
    return passCourse && passYear && passBlock;
  });

  const filledCards = [...filteredSections];
  const emptySlots = Math.max(0, 25 - filledCards.length);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 text-slate-900 sm:px-6">
        <div className="mb-8 rounded-2xl border border-indigo-200/50 bg-gradient-to-r from-indigo-50 to-blue-50 p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-900">👨‍🏫 Teacher Portal</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900">Your Classes & Rosters</h1>
          <p className="mt-2 text-slate-600">
            Active teacher: <strong className="text-indigo-700">{activeTeacher?.fullName ?? "No active teacher account"}</strong>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Assigned subject{editableSubjects.length !== 1 ? "s" : ""}: {editableSubjects.length > 0 ? editableSubjects.join(", ") : "None"}
          </p>
        </div>

        <article className="rounded-2xl border border-indigo-200/50 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl font-black text-slate-900">📚 My Students</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={courseFilter}
                onChange={(event) => setCourseFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Courses</option>
                {allCourses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>

              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Year Sections</option>
                {allYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={blockFilter}
                onChange={(event) => setBlockFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Blocks</option>
                {allBlocks.map((block) => (
                  <option key={block} value={block}>
                    {block}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {filledCards.map((section) => {
              const count = getActiveStudents(section).length;
              return (
                <button
                  key={section.id}
                  onClick={() => setSelectedSectionId(section.id)}
                  className="group rounded-xl border border-indigo-200/50 bg-gradient-to-br from-indigo-50 to-blue-50 p-4 text-left transition hover:shadow-lg hover:border-indigo-300"
                >
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-700 group-hover:text-indigo-900">Section</p>
                  <h3 className="mt-2 text-sm font-black text-slate-900 group-hover:text-indigo-700">{section.name}</h3>
                  <p className="mt-3 text-xs font-semibold text-slate-600">
                    👥 {count} student{count !== 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}

            {Array.from({ length: emptySlots }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-4"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Empty Slot</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      {selectedSection && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/20 bg-white/95 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900">👥 Roster</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{selectedSection.name}</h3>
              </div>
              <button
                onClick={() => setSelectedSectionId(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 transition"
              >
                ✕ Close
              </button>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {getActiveStudents(selectedSection).map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className="flex items-center gap-3 rounded-lg border border-indigo-200/50 bg-gradient-to-br from-indigo-50 to-blue-50 p-4 text-left hover:border-indigo-400 hover:shadow-md transition"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-lg border border-indigo-200 bg-slate-100">
                    {student.imageUrl ? (
                      <Image
                        src={student.imageUrl}
                        alt={`${student.fullName} profile`}
                        width={48}
                        height={48}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                        {student.fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{student.fullName}</p>
                    <p className="text-xs text-slate-600">{student.studentNumber}</p>
                  </div>
                  <span className="text-lg">→</span>
                </button>
              ))}
              {getActiveStudents(selectedSection).length === 0 && (
                <p className="col-span-full text-sm text-slate-500 text-center py-4">No active students in this section.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-white/95 backdrop-blur-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900">📝 Grade Entry</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{selectedStudent.fullName}</h3>
                <p className="text-sm text-slate-600 mt-1">{selectedStudent.studentNumber}</p>
                <p className="text-xs font-semibold text-indigo-700 mt-1">
                  You can edit only: {editableSubjects.length > 0 ? editableSubjects.join(", ") : "No subjects assigned"}
                </p>
              </div>
              {selectedStudent.imageUrl && (
                <div className="h-16 w-16 overflow-hidden rounded-lg border-2 border-indigo-200">
                  <Image
                    src={selectedStudent.imageUrl}
                    alt={`${selectedStudent.fullName} profile`}
                    width={64}
                    height={64}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <button
                onClick={() => setSelectedStudentId(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden shadow-md">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gradient-to-r from-indigo-100 to-blue-100">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 text-left font-black text-slate-900">Subject</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left font-black text-slate-900">Prelim</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left font-black text-slate-900">Midterm</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left font-black text-slate-900">Finals</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left font-black text-slate-900">GWA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {gradeDraft.map((subject, index) => {
                    const rowGwa = computeTermGwa(subject);
                    const canEdit = editableSubjects.includes(subject.name);

                    return (
                      <tr key={subject.name} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{subject.name}</span>
                            {!canEdit && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                                View Only
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {canEdit ? (
                            <input
                              value={subject.prelim}
                              onChange={(event) =>
                                setGradeDraft((prev) =>
                                  prev.map((entry, rowIndex) =>
                                    rowIndex === index
                                      ? { ...entry, prelim: event.target.value }
                                      : entry,
                                  ),
                                )
                              }
                              placeholder="0-100"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-slate-600">{subject.prelim || "-"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {canEdit ? (
                            <input
                              value={subject.midterm}
                              onChange={(event) =>
                                setGradeDraft((prev) =>
                                  prev.map((entry, rowIndex) =>
                                    rowIndex === index
                                      ? { ...entry, midterm: event.target.value }
                                      : entry,
                                  ),
                                )
                              }
                              placeholder="0-100"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-slate-600">{subject.midterm || "-"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {canEdit ? (
                            <input
                              value={subject.finals}
                              onChange={(event) =>
                                setGradeDraft((prev) =>
                                  prev.map((entry, rowIndex) =>
                                    rowIndex === index
                                      ? { ...entry, finals: event.target.value }
                                      : entry,
                                  ),
                                )
                              }
                              placeholder="0-100"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-slate-600">{subject.finals || "-"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-black text-indigo-700 text-center">
                          {rowGwa}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-indigo-50 font-black">
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-right text-slate-900 font-black"
                    >
                      Overall GWA →
                    </td>
                    <td className="px-4 py-3 text-center text-indigo-700">
                      {computeOverallGwa(gradeDraft)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-4">
              <button
                onClick={() => {
                  if (editableSubjects.length === 0) {
                    window.alert("No subject is assigned to this teacher account.");
                    return;
                  }

                  const shouldContinue = window.confirm("Save grades for this student? Click OK to continue or Cancel to review.");
                  if (!shouldContinue) return;

                  updateDatabase((current) => {
                    const existingStudent = current.students.find((entry) => entry.id === selectedStudent.id);
                    const existingGrades = existingStudent ? normalizeSubjectGrades(existingStudent) : [];

                    const mergedGrades = existingGrades.map((entry) => {
                      if (!editableSubjects.includes(entry.name)) return entry;
                      const edited = gradeDraft.find((subject) => subject.name === entry.name);
                      return edited ?? entry;
                    });

                    const first = mergedGrades[0] ?? {
                      prelim: "",
                      midterm: "",
                      finals: "",
                    };

                    const next = {
                      ...current,
                      students: current.students.map((entry) =>
                        entry.id === selectedStudent.id
                          ? {
                              ...entry,
                              grades: {
                                coreMath: first.prelim,
                                communication: first.midterm,
                                systemsDesign: first.finals,
                                subjects: mergedGrades,
                              },
                            }
                          : entry,
                      ),
                    };
                    return appendLog("@edu", `Updated grades for ${selectedStudent.fullName}`, next);
                  });
                  setSelectedStudentId(null);
                }}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-sm font-black text-white hover:shadow-lg hover:shadow-indigo-500/30 transition"
              >
                ✓ Save Grades
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
