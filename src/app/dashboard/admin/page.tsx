"use client";

import { useMemo, useState } from "react";
import {
  appendLog,
  computeOverallGwa,
  computeTermGwa,
  defaultSubjectNames,
  makeId,
  normalizeSubjectGrades,
  type Status,
} from "~/lib/db";
import { useDatabase } from "~/hooks/useDatabase";

export default function AdminDashboard() {
  const { db, updateDatabase } = useDatabase();

  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("changeme123");
  const [newTeacherSubject, setNewTeacherSubject] = useState<string>(defaultSubjectNames[0]);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const teachers = useMemo(
    () => db?.users.filter((user) => user.role === "TEACHER") ?? [],
    [db],
  );

  const councilor = useMemo(
    () => db?.users.find((user) => user.role === "COUNCILOR") ?? null,
    [db],
  );

  const selectedStudent = useMemo(
    () => db?.students.find((student) => student.id === selectedStudentId) ?? null,
    [db, selectedStudentId],
  );

  const visibleTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLowerCase();
    if (!query) return teachers;

    return teachers.filter((teacher) => {
      return (
        teacher.fullName.toLowerCase().includes(query) ||
        teacher.username.toLowerCase().includes(query) ||
        teacher.password.toLowerCase().includes(query)
      );
    });
  }, [teacherSearch, teachers]);

  const courseOptions = useMemo(() => {
    return Array.from(
      new Set((db?.students ?? []).map((student) => student.profile.program)),
    );
  }, [db]);

  function getSectionName(sectionId: string | null) {
    if (!db || !sectionId) return "Unassigned";
    return db.sections.find((section) => section.id === sectionId)?.name ?? "Unassigned";
  }

  function getTeacherName(teacherId: string | null) {
    if (!db || !teacherId) return "Unassigned";
    return db.users.find((user) => user.id === teacherId)?.fullName ?? "Unassigned";
  }

  const visibleStudents = useMemo(() => {
    if (!db) return [];

    const query = studentSearch.trim().toLowerCase();

    return db.students.filter((student) => {
      const passCourse =
        courseFilter === "ALL" || student.profile.program === courseFilter;
      const sectionName =
        db.sections.find((section) => section.id === student.assignment.sectionId)?.name ??
        "Unassigned";
      const haystack = [
        student.fullName,
        student.studentNumber,
        student.profile.program,
        student.profile.yearLevel,
        sectionName,
      ]
        .join(" ")
        .toLowerCase();

      const passSearch = !query || haystack.includes(query);
      return passCourse && passSearch;
    });
  }, [courseFilter, db, studentSearch]);

  const sectionCards = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; course: string; sectionName: string; students: typeof visibleStudents }
    >();

    for (const student of visibleStudents) {
      const sectionName =
        db?.sections.find((section) => section.id === student.assignment.sectionId)?.name ??
        "Unassigned";
      const key = student.assignment.sectionId ?? `unassigned-${student.profile.program}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          course: student.profile.program,
          sectionName,
          students: [],
        });
      }

      groups.get(key)?.students.push(student);
    }

    return Array.from(groups.values()).sort((left, right) => {
      return `${left.course} ${left.sectionName}`.localeCompare(
        `${right.course} ${right.sectionName}`,
      );
    });
  }, [db, visibleStudents]);

  const selectedSectionCard = useMemo(
    () => sectionCards.find((section) => section.key === selectedSectionKey) ?? null,
    [sectionCards, selectedSectionKey],
  );

  if (!db) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p className="text-lg text-slate-600">Loading workspace...</p>
      </main>
    );
  }

  function buildTeacherUsername(
    name: string,
    existingUsers: Array<{ username: string }>,
  ) {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, ".");

    const sanitizedBase = base || "teacher";
    let nextUsername = `${sanitizedBase}@edu`;
    let counter = 2;

    while (
      existingUsers.some((user) => user.username.toLowerCase() === nextUsername)
    ) {
      nextUsername = `${sanitizedBase}${counter}@edu`;
      counter += 1;
    }

    return nextUsername;
  }

  function toggleTeacherStatus(teacherId: string, fullName: string, currentStatus: Status) {
    const nextStatus: Status = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const shouldContinue = window.confirm(
      `Do you want to ${nextStatus === "ACTIVE" ? "enable" : "disable"} ${fullName}? Click OK to continue or Cancel to stop.`,
    );
    if (!shouldContinue) return;

    updateDatabase((current) => {
      const next = {
        ...current,
        users: current.users.map((entry) =>
          entry.id === teacherId ? { ...entry, status: nextStatus } : entry,
        ),
      };

      return appendLog(
        "@admin",
        `${nextStatus === "ACTIVE" ? "Enabled" : "Disabled"} teacher account for ${fullName}`,
        next,
      );
    });

    setNotice(`${fullName} is now ${nextStatus}.`);
  }

  const activeTeachers = teachers.filter((teacher) => teacher.status === "ACTIVE").length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 text-slate-900 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-amber-700">@admin</p>
        <h1 className="mt-1 text-3xl font-black">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Admin manages teacher accounts and can review student records by course.
        </p>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      )}

      <section className="rounded-2xl border border-amber-200 bg-white p-5">
        <h2 className="text-2xl font-black text-slate-900">Create Teacher Account</h2>
        <p className="mt-1 text-sm text-slate-600">
          Only teacher accounts can be added here. Admin and councilor stay fixed.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <input
            value={newTeacherName}
            onChange={(event) => setNewTeacherName(event.target.value)}
            placeholder="Teacher full name"
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
          />
          <input
            value={newTeacherPassword}
            onChange={(event) => setNewTeacherPassword(event.target.value)}
            placeholder="Password"
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
          />
          <select
            value={newTeacherSubject}
            onChange={(event) => setNewTeacherSubject(event.target.value)}
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
          >
            {defaultSubjectNames.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const name = newTeacherName.trim();
              const password = newTeacherPassword.trim();

              if (!name || !password) {
                setNotice("Teacher name and password are required.");
                return;
              }

              const shouldContinue = window.confirm("Create this teacher account? Click OK to continue or Cancel to stop.");
              if (!shouldContinue) return;

              updateDatabase((current) => {
                const username = buildTeacherUsername(name, current.users);
                const next = {
                  ...current,
                  users: [
                    {
                      id: `usr-${makeId()}`,
                      fullName: name,
                      username,
                      password,
                      role: "TEACHER" as const,
                      shortcut: "@edu" as const,
                      status: "ACTIVE" as const,
                      assignedSubjects: [newTeacherSubject],
                    },
                    ...current.users,
                  ],
                };

                return appendLog(
                  "@admin",
                  `Created teacher account for ${name} (${username})`,
                  next,
                );
              });

              setNewTeacherName("");
              setNewTeacherPassword("changeme123");
              setNewTeacherSubject(defaultSubjectNames[0]);
              setNotice("Teacher account created.");
            }}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
          >
            Add Teacher
          </button>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          onClick={() => setShowTeacherModal(true)}
          className="rounded-2xl border border-indigo-300 bg-indigo-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-xs font-black uppercase tracking-wide text-indigo-700">Teacher Accounts</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{teachers.length}</p>
          <p className="mt-1 text-sm text-slate-700">
            Click to view all teacher email and password cards.
          </p>
        </button>

        <div className="rounded-2xl border border-teal-300 bg-teal-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-teal-700">Councilor Account</p>
          <p className="mt-1 text-lg font-black text-slate-900">{councilor?.fullName ?? "No councilor"}</p>
          <p className="mt-2 text-xs font-black uppercase tracking-wide text-teal-700">Email / Username</p>
          <p className="text-sm font-semibold text-slate-700">{councilor?.username ?? "-"}</p>
          <p className="mt-2 text-xs font-black uppercase tracking-wide text-teal-700">Password</p>
          <p className="text-sm font-semibold text-slate-700">{councilor?.password ?? "-"}</p>
        </div>

        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Active Teachers</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{activeTeachers}</p>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-600">Sections Visible</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{sectionCards.length}</p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Student Directory</h2>
            <p className="mt-1 text-sm text-slate-600">
              Filter by course, then open a section card to see all students inside that section.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
            <input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Search course, section, student, ID"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All Courses</option>
              {courseOptions.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sectionCards.map((section) => (
            <button
              key={section.key}
              onClick={() => setSelectedSectionKey(section.key)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">{section.course}</p>
              <p className="mt-1 text-lg font-black text-slate-900">{section.sectionName}</p>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                <p>
                  <span className="font-black">Program:</span> {section.course}
                </p>
                <p>
                  <span className="font-black">Section:</span> {section.sectionName}
                </p>
                <p>
                  <span className="font-black">Students:</span> {section.students.length}
                </p>
              </div>
            </button>
          ))}
        </div>

        {sectionCards.length === 0 && (
          <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            No section matched the selected course or search term.
          </div>
        )}
      </section>

      {selectedSectionCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedSectionKey(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-amber-300 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                  Section Student List
                </p>
                <h3 className="mt-1 text-3xl font-black text-slate-900">
                  {selectedSectionCard.sectionName}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Program: {selectedSectionCard.course} • {selectedSectionCard.students.length} student{selectedSectionCard.students.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedSectionKey(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {selectedSectionCard.students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-amber-300 hover:shadow-md"
                >
                  <p className="text-lg font-black text-slate-900">{student.fullName}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {student.studentNumber}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <p>
                      <span className="font-black">Year:</span> {student.profile.yearLevel}
                    </p>
                    <p>
                      <span className="font-black">Status:</span> {student.status}
                    </p>
                    <p>
                      <span className="font-black">Teacher:</span> {getTeacherName(student.assignment.teacherId)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTeacherModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowTeacherModal(false);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-indigo-300 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-700">Teacher Account Vault</p>
                <h3 className="mt-1 text-3xl font-black text-slate-900">All Teacher Credentials</h3>
                <p className="mt-1 text-sm text-slate-600">Search by name, email/username, or password.</p>
              </div>
              <button
                onClick={() => setShowTeacherModal(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              <input
                value={teacherSearch}
                onChange={(event) => setTeacherSearch(event.target.value)}
                placeholder="Search teacher account"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"
                >
                  <p className="text-lg font-black text-slate-900">{teacher.fullName}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-indigo-700">Email / Username</p>
                  <p className="text-sm font-semibold text-slate-700">{teacher.username}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-indigo-700">Password</p>
                  <p className="text-sm font-semibold text-slate-700">{teacher.password}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-indigo-700">Assigned Subjects</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {teacher.assignedSubjects?.length ? teacher.assignedSubjects.join(", ") : "Not assigned"}
                  </p>
                  <p
                    className={`mt-3 inline-flex rounded-full px-2 py-1 text-xs font-black ${
                      teacher.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {teacher.status}
                  </p>
                  <button
                    onClick={() =>
                      toggleTeacherStatus(teacher.id, teacher.fullName, teacher.status)
                    }
                    className="mt-3 w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-indigo-700 hover:bg-indigo-100"
                  >
                    {teacher.status === "ACTIVE" ? "Disable Account" : "Enable Account"}
                  </button>
                </div>
              ))}
            </div>

            {visibleTeachers.length === 0 && (
              <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No teacher account matched your search.
              </div>
            )}
          </div>
        </div>
      )}

      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedStudentId(null);
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-amber-300 bg-[#fffaf0] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Admin Student Detail</p>
                <h3 className="mt-1 text-3xl font-black text-slate-900">{selectedStudent.fullName}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">{selectedStudent.studentNumber}</p>
              </div>
              <button
                onClick={() => setSelectedStudentId(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Course</p>
                <p className="text-lg font-black text-slate-900">{selectedStudent.profile.program}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Section</p>
                <p className="text-lg font-black text-slate-900">{getSectionName(selectedStudent.assignment.sectionId)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Year Level</p>
                <p className="text-lg font-black text-slate-900">{selectedStudent.profile.yearLevel}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Assigned Teacher</p>
                <p className="text-lg font-black text-slate-900">{getTeacherName(selectedStudent.assignment.teacherId)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Guardian</p>
                <p className="text-sm font-semibold text-slate-700">{selectedStudent.profile.guardian}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Contact</p>
                <p className="text-sm font-semibold text-slate-700">{selectedStudent.profile.contact}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Grades</p>
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-700">Subject</th>
                        <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-700">Prelim</th>
                        <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-700">Midterm</th>
                        <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-700">Finals</th>
                        <th className="border-b border-slate-200 px-3 py-2 text-left font-black text-slate-700">GWA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizeSubjectGrades(selectedStudent).map((subject) => (
                        <tr key={subject.name}>
                          <td className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-800">
                            {subject.name}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2">
                            {subject.prelim || "N/A"}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2">
                            {subject.midterm || "N/A"}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2">
                            {subject.finals || "N/A"}
                          </td>
                          <td className="border-b border-slate-200 px-3 py-2 font-black text-slate-900">
                            {computeTermGwa(subject)}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-2 text-right font-black uppercase tracking-wide text-slate-700"
                        >
                          Overall GWA
                        </td>
                        <td className="px-3 py-2 font-black text-amber-700">
                          {computeOverallGwa(normalizeSubjectGrades(selectedStudent))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Guidance Logs</p>
                <div className="mt-2 space-y-2">
                  {selectedStudent.logs.map((entry, index) => (
                    <div
                      key={`${entry}-${index}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    >
                      {entry}
                    </div>
                  ))}
                  {selectedStudent.logs.length === 0 && (
                    <p className="text-sm text-slate-500">No logs yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}