"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  appendLog,
  computeOverallGwa,
  computeTermGwa,
  createDefaultSubjectGrades,
  makeId,
  normalizeSubjectGrades,
  type Student,
  type Status,
  type SubjectGrade,
} from "~/lib/db";
import { useDatabase } from "~/hooks/useDatabase";

type MasterTab = "PROFILE" | "GRADES" | "LOGS";

const guidanceEntryPattern =
  /^\[(\d{2}:\d{2})\]\s*\|\s*(Solution|Penalty)(?::\s*(.+?))?\s*\|\s*(Minor Offense|Major Offense)\s*\|\s*(.+)$/i;

const toCompressedDataUrl = (file: File, maxSize = 320, quality = 0.72) =>
  new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = document.createElement("img");

    image.onload = () => {
      const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to prepare image canvas."));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      const result = canvas.toDataURL("image/jpeg", quality);
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to read image file."));
    };

    image.src = objectUrl;
  });

export default function CouncilorDashboard() {
  const { db, updateDatabase } = useDatabase();

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentNumber, setNewStudentNumber] = useState("");
  const [newStudentProgram, setNewStudentProgram] = useState("BSIT");
  const [newStudentYearLevel, setNewStudentYearLevel] = useState("1ST YR");
  const [newStudentImage, setNewStudentImage] = useState("");

  const [masterStudentId, setMasterStudentId] = useState<string | null>(null);
  const [masterTab, setMasterTab] = useState<MasterTab>("PROFILE");
  const [registrySearchId, setRegistrySearchId] = useState("");
  const [assignmentTeacherId, setAssignmentTeacherId] = useState("");
  const [assignmentSectionId, setAssignmentSectionId] = useState("");
  const [caseLogEntry, setCaseLogEntry] = useState("");
  const [caseLogTime, setCaseLogTime] = useState(() => {
    return new Date().toTimeString().slice(0, 5);
  });
  const [caseLogAction, setCaseLogAction] = useState<"Solution" | "Penalty">(
    "Solution",
  );
  const [caseLogActionDetail, setCaseLogActionDetail] = useState("");
  const [caseLogOffense, setCaseLogOffense] = useState<
    "Minor Offense" | "Major Offense"
  >("Minor Offense");
  const [gradeDraft, setGradeDraft] = useState<SubjectGrade[]>(createDefaultSubjectGrades());
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const teachers = useMemo(
    () => db?.users.filter((u) => u.role === "TEACHER") ?? [],
    [db],
  );

  const masterStudent = useMemo(
    () => db?.students.find((s) => s.id === masterStudentId) ?? null,
    [db, masterStudentId],
  );

  useEffect(() => {
    if (!masterStudent) return;
    setAssignmentTeacherId(masterStudent.assignment.teacherId ?? "");
    setAssignmentSectionId(masterStudent.assignment.sectionId ?? "");
    setCaseLogTime(new Date().toTimeString().slice(0, 5));
    setGradeDraft(normalizeSubjectGrades(masterStudent));
  }, [masterStudent]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!db) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p className="text-lg text-slate-600">Loading workspace...</p>
      </main>
    );
  }

  const allCourses = Array.from(
    new Set(db.students.map((student) => student.profile.program)),
  );
  const allYears = Array.from(
    new Set(db.students.map((student) => student.profile.yearLevel)),
  );
  const allStatuses = Array.from(new Set(db.students.map((student) => student.status)));

  const filteredStudents = db.students.filter((student) => {
    const passCourse = courseFilter === "ALL" || student.profile.program === courseFilter;
    const passYear = yearFilter === "ALL" || student.profile.yearLevel === yearFilter;
    const passStatus = statusFilter === "ALL" || student.status === statusFilter;
    return passCourse && passYear && passStatus;
  });

  const visibleCards = filteredStudents.slice(0, 25);
  const emptySlots = Math.max(0, 25 - visibleCards.length);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 text-slate-900 sm:px-6">
        <div className="mb-8 rounded-2xl border border-teal-200/50 bg-gradient-to-r from-teal-50 to-cyan-50 p-6 flex items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-teal-900">👩‍🎓 Councilor Portal</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900">Student Registry & Case Tracking</h1>
            <p className="mt-2 text-slate-600">Manage student lifecycle, enrollment, and guidance records.</p>
          </div>

          <button
            onClick={() => setShowAddStudentModal(true)}
            className="shrink-0 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 text-sm font-black text-white hover:shadow-lg hover:shadow-teal-500/30 transition"
          >
            ➕ Add Student
          </button>
        </div>

        {notice && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
              notice.type === "success"
                ? "border-emerald-300/50 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700"
                : "border-rose-300/50 bg-gradient-to-r from-rose-50 to-red-50 text-rose-700"
            }`}
          >
            {notice.type === "success" ? "✓ " : "⚠️ "}{notice.text}
          </div>
        )}

        <article className="rounded-2xl border border-teal-200/50 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">📚 Student Registry</h2>
            <p className="mt-1 text-sm text-slate-600">
              Click a card to view profile, manage grades, and track guidance entries.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-5 w-full sm:w-auto">
            <input
              value={registrySearchId}
              onChange={(event) => setRegistrySearchId(event.target.value)}
              placeholder="Search ID..."
              className="sm:col-span-2 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <button
              onClick={() => {
                const query = registrySearchId.trim().toLowerCase();
                if (!query) {
                  setNotice({
                    type: "error",
                    text: "Type a student ID to search.",
                  });
                  return;
                }

                const found = db.students.find(
                  (student) => student.studentNumber.toLowerCase() === query,
                );

                if (!found) {
                  setNotice({
                    type: "error",
                    text: "Student ID not found.",
                  });
                  return;
                }

                setMasterStudentId(found.id);
                setMasterTab("PROFILE");
                setNotice({
                  type: "success",
                  text: `Loaded ${found.fullName}.`,
                });
              }}
              className="rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2 text-sm font-black text-white hover:shadow-md transition"
            >
              🔍 Search
            </button>

            <select
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="ALL">All Levels</option>
              {allYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="ALL">All Statuses</option>
              {allStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {visibleCards.map((student) => (
            <button
              key={student.id}
              onClick={() => {
                setMasterStudentId(student.id);
                setMasterTab("PROFILE");
              }}
              className="group rounded-lg border border-teal-200/50 bg-gradient-to-br from-teal-50 to-cyan-50 p-4 text-left transition hover:shadow-lg hover:border-teal-300"
            >
              <div className="mb-3 h-16 w-16 overflow-hidden rounded-lg border border-teal-200 bg-slate-100">
                {student.imageUrl ? (
                  <Image
                    src={student.imageUrl}
                    alt={`${student.fullName} profile`}
                    width={64}
                    height={64}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                    {student.fullName.charAt(0)}
                  </div>
                )}
              </div>
              <p className="font-black text-slate-900 group-hover:text-teal-700 truncate">{student.fullName}</p>
              <p className="mt-1 text-xs text-slate-600">{student.studentNumber}</p>
              <p className="mt-3 text-xs font-semibold text-slate-600">
                {student.profile.program} • {student.profile.yearLevel}
              </p>
              <div className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold" style={{
                backgroundColor: student.status === 'ACTIVE' ? '#d1fae5' : student.status === 'DISABLED' ? '#fee2e2' : '#fef3c7',
                color: student.status === 'ACTIVE' ? '#065f46' : student.status === 'DISABLED' ? '#7c2d12' : '#92400e'
              }}>
                {student.status}
              </div>
            </button>
          ))}

          {Array.from({ length: emptySlots }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-4"
            >
              <p className="text-sm font-bold uppercase text-slate-400">Empty</p>
            </div>
          ))}
        </div>
      </article>
      </div>

      {showAddStudentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowAddStudentModal(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-white/95 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-900">✚ New Student</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900">Student Intake Form</h3>
              </div>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <input
                value={newStudentNumber}
                onChange={(e) => setNewStudentNumber(e.target.value)}
                placeholder="Student number"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">📷 Student Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const dataUrl = await toCompressedDataUrl(file);
                      setNewStudentImage(dataUrl);
                    } catch {
                      setNotice({
                        type: "error",
                        text: "Failed to process image. Try another file.",
                      });
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
                />
              </div>
              
              {newStudentImage && (
                <div className="h-24 w-24 overflow-hidden rounded-lg border-2 border-teal-300">
                  <Image
                    src={newStudentImage}
                    alt="New student preview"
                    width={96}
                    height={96}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newStudentProgram}
                  onChange={(e) => setNewStudentProgram(e.target.value)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="BSIT">BSIT</option>
                  <option value="BSEDUC">BSEDUC</option>
                  <option value="BSBA">BSBA</option>
                </select>
                <select
                  value={newStudentYearLevel}
                  onChange={(e) => setNewStudentYearLevel(e.target.value)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="1ST YR">1ST YR</option>
                  <option value="2ND YR">2ND YR</option>
                  <option value="3RD YR">3RD YR</option>
                  <option value="4TH YR">4TH YR</option>
                </select>
              </div>

              <button
                onClick={() => {
                  const name = newStudentName.trim();
                  const studentNumber = newStudentNumber.trim();
                  if (!name || !studentNumber) {
                    setNotice({
                      type: "error",
                      text: "Student name and number are required.",
                    });
                    return;
                  }

                  const shouldContinue = window.confirm("Save this new student record? Click OK to continue or Cancel to review.");
                  if (!shouldContinue) return;

                  const newStudent: Student = {
                    id: `stud-${makeId()}`,
                    studentNumber,
                    fullName: name,
                    status: "ACTIVE",
                    profile: {
                      age: 18,
                      guardian: "To be updated",
                      contact: "To be updated",
                      program: newStudentProgram,
                      yearLevel: newStudentYearLevel,
                    },
                    imageUrl: newStudentImage || undefined,
                    assignment: { teacherId: null, sectionId: null },
                    grades: {
                      coreMath: "",
                      communication: "",
                      systemsDesign: "",
                      subjects: createDefaultSubjectGrades(),
                    },
                    logs: ["Created from Student Intake"],
                  };

                  updateDatabase((current) => {
                    const next = {
                      ...current,
                      students: [newStudent, ...current.students],
                    };
                    return appendLog("@conci", `Admitted student ${name} (${studentNumber})`, next);
                  });

                  setNewStudentName("");
                  setNewStudentNumber("");
                  setNewStudentImage("");
                  setShowAddStudentModal(false);
                  setNotice({
                    type: "success",
                    text: "Student saved successfully.",
                  });
                }}
                className="w-full rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3 text-sm font-black text-white hover:shadow-lg hover:shadow-teal-500/30 transition"
              >
                ✓ Save Student
              </button>
            </div>
          </div>
        </div>
      )}

      {masterStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#0ea5a4]/35 bg-[#f0faf9] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0ea5a4]">
                  ALALAY Guidance Councilor Hub
                </p>
                <h3 className="mt-1 text-3xl font-black text-slate-900">
                  Student ID Search and Detailed Record
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Guidance Time: {caseLogTime}
                </p>
              </div>
              <button
                onClick={() => setMasterStudentId(null)}
                className="rounded-lg border border-[#0ea5a4]/40 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-[#ecfeff]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#0ea5a4]/30 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  {masterStudent.imageUrl ? (
                    <Image
                      src={masterStudent.imageUrl}
                      alt={`${masterStudent.fullName} profile`}
                      width={56}
                      height={56}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-500">
                      NO IMAGE
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900">{masterStudent.fullName}</p>
                  <p className="text-sm font-semibold text-slate-600">{masterStudent.studentNumber}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-[#0ea5a4]/20 bg-[#e6f7f5] p-2">
              <button
                onClick={() => setMasterTab("PROFILE")}
                className={`rounded-xl px-5 py-2 text-sm font-black ${
                  masterTab === "PROFILE"
                    ? "bg-[#0ea5a4] text-white"
                    : "border border-[#0ea5a4]/35 bg-white text-slate-700"
                }`}
              >
                Information
              </button>
              <button
                onClick={() => setMasterTab("GRADES")}
                className={`rounded-xl px-5 py-2 text-sm font-black ${
                  masterTab === "GRADES"
                    ? "bg-[#0ea5a4] text-white"
                    : "border border-[#0ea5a4]/35 bg-white text-slate-700"
                }`}
              >
                Grades
              </button>
              <button
                onClick={() => setMasterTab("LOGS")}
                className={`rounded-xl px-5 py-2 text-sm font-black ${
                  masterTab === "LOGS"
                    ? "bg-[#0ea5a4] text-white"
                    : "border border-[#0ea5a4]/35 bg-white text-slate-700"
                }`}
              >
                Guidance Info
              </button>
            </div>

            {masterTab === "PROFILE" && (
              <div className="mt-4 grid gap-3 rounded-xl border border-[#0ea5a4]/25 bg-white p-4 shadow-sm md:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold md:col-span-2">
                  Student image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await toCompressedDataUrl(file);
                        updateDatabase((current) => ({
                          ...current,
                          students: current.students.map((entry) =>
                            entry.id === masterStudent.id
                              ? { ...entry, imageUrl: dataUrl }
                              : entry,
                          ),
                        }));
                        setNotice({
                          type: "success",
                          text: "Student image updated.",
                        });
                      } catch {
                        setNotice({
                          type: "error",
                          text: "Failed to process image. Try another file.",
                        });
                      }
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  {masterStudent.imageUrl && (
                    <div className="h-24 w-24 overflow-hidden rounded-lg border border-slate-300">
                      <Image
                        src={masterStudent.imageUrl}
                        alt={`${masterStudent.fullName} preview`}
                        width={96}
                        height={96}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </label>

                <label className="grid gap-1 text-sm font-semibold">
                  Guardian
                  <input
                    value={masterStudent.profile.guardian}
                    onChange={(e) => {
                      const guardian = e.target.value;
                      updateDatabase((current) => ({
                        ...current,
                        students: current.students.map((entry) =>
                          entry.id === masterStudent.id
                            ? { ...entry, profile: { ...entry.profile, guardian } }
                            : entry,
                        ),
                      }));
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="grid gap-1 text-sm font-semibold">
                  Contact
                  <input
                    value={masterStudent.profile.contact}
                    onChange={(e) => {
                      const contact = e.target.value;
                      updateDatabase((current) => ({
                        ...current,
                        students: current.students.map((entry) =>
                          entry.id === masterStudent.id
                            ? { ...entry, profile: { ...entry.profile, contact } }
                            : entry,
                        ),
                      }));
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="grid gap-1 text-sm font-semibold">
                  Program
                  <input
                    value={masterStudent.profile.program}
                    onChange={(e) => {
                      const program = e.target.value;
                      updateDatabase((current) => ({
                        ...current,
                        students: current.students.map((entry) =>
                          entry.id === masterStudent.id
                            ? { ...entry, profile: { ...entry.profile, program } }
                            : entry,
                        ),
                      }));
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="grid gap-1 text-sm font-semibold">
                  Student status
                  <select
                    value={masterStudent.status}
                    onChange={(e) => {
                      const status = e.target.value as Status;
                      updateDatabase((current) => {
                        const next = {
                          ...current,
                          students: current.students.map((entry) =>
                            entry.id === masterStudent.id ? { ...entry, status } : entry,
                          ),
                        };
                        return appendLog("@conci", `Marked ${masterStudent.fullName} as ${status}`, next);
                      });
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DROPOUT">DROPOUT</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-semibold">
                  Teacher
                  <select
                    value={assignmentTeacherId}
                    onChange={(e) => setAssignmentTeacherId(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="">Unassigned</option>
                    {teachers
                      .filter((t) => t.status === "ACTIVE")
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-semibold">
                  Section
                  <select
                    value={assignmentSectionId}
                    onChange={(e) => setAssignmentSectionId(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="">Unassigned</option>
                    {db.sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  onClick={() => {
                    if (assignmentSectionId && !assignmentTeacherId) {
                      setNotice({
                        type: "error",
                        text: "Select a teacher before assigning a section.",
                      });
                      return;
                    }

                    const shouldContinue = window.confirm("Save profile and assignment changes? Click OK to continue or Cancel to review.");
                    if (!shouldContinue) return;

                    updateDatabase((current) => {
                      const nextSections = current.sections.map((section) => ({
                        ...section,
                        studentIds: section.studentIds.filter((id) => id !== masterStudent.id),
                      }));

                      if (assignmentSectionId) {
                        const target = nextSections.find((section) => section.id === assignmentSectionId);
                        if (target && !target.studentIds.includes(masterStudent.id)) {
                          target.studentIds.push(masterStudent.id);
                          target.teacherId = assignmentTeacherId || null;
                        }
                      }

                      const next = {
                        ...current,
                        sections: nextSections,
                        students: current.students.map((entry) =>
                          entry.id === masterStudent.id
                            ? {
                                ...entry,
                                assignment: {
                                  teacherId: assignmentTeacherId || null,
                                  sectionId: assignmentSectionId || null,
                                },
                              }
                            : entry,
                        ),
                      };

                      const teacherName =
                        current.users.find((user) => user.id === assignmentTeacherId)?.fullName ?? "Unassigned";

                      return appendLog(
                        "@conci",
                        `Assigned ${masterStudent.fullName} to ${teacherName}${assignmentSectionId ? ` (${assignmentSectionId})` : ""}`,
                        next,
                      );
                    });

                    setNotice({
                      type: "success",
                      text: "Profile and assignment saved. Teacher dashboard sync updated.",
                    });
                  }}
                  className="rounded-lg bg-[#0ea5a4] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b8f8d] md:col-span-2"
                >
                  Save Profile and Assignment
                </button>
              </div>
            )}

            {masterTab === "GRADES" && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[#0ea5a4]/20 bg-[#f0fdfa] px-3 py-2 text-sm font-semibold text-slate-700">
                  Grades are view-only in Councilor portal. Teachers can add and edit grades.
                </div>
                <div className="overflow-hidden rounded-xl border border-[#0ea5a4]/25 bg-white shadow-sm">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-[#dff4f2]">
                      <tr>
                        <th className="border-b border-[#0ea5a4]/25 px-3 py-2 text-left font-black text-slate-700">Subject</th>
                        <th className="border-b border-[#0ea5a4]/25 px-3 py-2 text-left font-black text-slate-700">Prelim</th>
                        <th className="border-b border-[#0ea5a4]/25 px-3 py-2 text-left font-black text-slate-700">Midterm</th>
                        <th className="border-b border-[#0ea5a4]/25 px-3 py-2 text-left font-black text-slate-700">Finals</th>
                        <th className="border-b border-[#0ea5a4]/25 px-3 py-2 text-left font-black text-slate-700">GWA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradeDraft.map((subject) => (
                        <tr key={subject.name}>
                          <td className="border-b border-[#0ea5a4]/20 px-3 py-2 font-semibold text-slate-800">
                            {subject.name}
                          </td>
                          <td className="border-b border-[#0ea5a4]/20 px-3 py-2 font-semibold text-slate-700">
                            {subject.prelim || "-"}
                          </td>
                          <td className="border-b border-[#0ea5a4]/20 px-3 py-2 font-semibold text-slate-700">
                            {subject.midterm || "-"}
                          </td>
                          <td className="border-b border-[#0ea5a4]/20 px-3 py-2 font-semibold text-slate-700">
                            {subject.finals || "-"}
                          </td>
                          <td className="border-b border-[#0ea5a4]/20 px-3 py-2 font-black text-slate-900">
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
                        <td className="px-3 py-2 font-black text-[#0ea5a4]">
                          {computeOverallGwa(gradeDraft)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {masterTab === "LOGS" && (
              <div className="mt-4 space-y-3">
                <div className="space-y-2 rounded-xl border border-[#0ea5a4]/20 bg-white p-3 shadow-sm">
                  <div className="grid gap-2 md:grid-cols-3">
                    <label className="grid gap-1 text-sm font-semibold text-slate-700">
                      Time
                      <input
                        type="time"
                        value={caseLogTime}
                        onChange={(e) => setCaseLogTime(e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-slate-700">
                      Solution or Penalty
                      <select
                        value={caseLogAction}
                        onChange={(e) => setCaseLogAction(e.target.value as "Solution" | "Penalty")}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="Solution">Solution</option>
                        <option value="Penalty">Penalty</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-slate-700">
                      Offense Type
                      <select
                        value={caseLogOffense}
                        onChange={(e) =>
                          setCaseLogOffense(e.target.value as "Minor Offense" | "Major Offense")
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="Minor Offense">Minor Offense</option>
                        <option value="Major Offense">Major Offense</option>
                      </select>
                    </label>
                  </div>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    Solution/Penalty Details
                    <input
                      value={caseLogActionDetail}
                      onChange={(e) => setCaseLogActionDetail(e.target.value)}
                      placeholder="Type the specific solution or penalty"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <textarea
                    value={caseLogEntry}
                    onChange={(e) => setCaseLogEntry(e.target.value)}
                    rows={3}
                    placeholder="Add disciplinary or case note"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      const text = caseLogEntry.trim();
                      if (!text) {
                        setNotice({
                          type: "error",
                          text: "Log entry cannot be empty.",
                        });
                        return;
                      }

                      if (!caseLogTime) {
                        setNotice({
                          type: "error",
                          text: "Select a guidance time.",
                        });
                        return;
                      }

                      const actionDetail = caseLogActionDetail.trim();
                      if (!actionDetail) {
                        setNotice({
                          type: "error",
                          text: "Type the solution or penalty details.",
                        });
                        return;
                      }

                      const shouldContinue = window.confirm("Save this guidance log entry? Click OK to continue or Cancel to review.");
                      if (!shouldContinue) return;

                      const formattedEntry = `[${caseLogTime}] | ${caseLogAction}: ${actionDetail} | ${caseLogOffense} | ${text}`;

                      updateDatabase((current) => {
                        const next = {
                          ...current,
                          students: current.students.map((entry) =>
                            entry.id === masterStudent.id
                              ? { ...entry, logs: [formattedEntry, ...entry.logs] }
                              : entry,
                          ),
                        };
                        return appendLog("@conci", `Added case log for ${masterStudent.fullName}`, next);
                      });
                      setCaseLogEntry("");
                      setCaseLogActionDetail("");
                      setNotice({
                        type: "success",
                        text: "Log saved successfully.",
                      });
                    }}
                    className="rounded-lg bg-[#0ea5a4] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b8f8d]"
                  >
                    Save Log Entry
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#0ea5a4]/25 bg-white shadow-sm">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-[#dff4f2]">
                      <tr>
                        <th className="border-b border-[#0ea5a4]/25 px-3 py-2 text-left font-black text-slate-700">#</th>
                        <th className="border-b border-[#0ea5a4]/25 px-3 py-2 text-left font-black text-slate-700">Time</th>
                        <th className="border-b border-[#0ea5a4]/25 px-3 py-2 text-left font-black text-slate-700">Solution / Penalty</th>
                        <th className="border-b border-[#0ea5a4]/25 px-3 py-2 text-left font-black text-slate-700">Minor / Major Offense</th>
                        <th className="border-b border-[#0ea5a4]/25 px-3 py-2 text-left font-black text-slate-700">Guidance Entry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterStudent.logs.map((entry, index) => {
                        const match = entry.match(guidanceEntryPattern);
                        const time = match?.[1] ?? "-";
                        const action = match?.[2] ?? "-";
                        const actionDetail = match?.[3] ?? "";
                        const offense = match?.[4] ?? "-";
                        const note = match?.[5] ?? entry;
                        const actionText = actionDetail ? `${action}: ${actionDetail}` : action;

                        return (
                          <tr key={`${entry}-${index}`}>
                            <td className="border-b border-[#0ea5a4]/20 px-3 py-2">{index + 1}</td>
                            <td className="border-b border-[#0ea5a4]/20 px-3 py-2">{time}</td>
                            <td className="border-b border-[#0ea5a4]/20 px-3 py-2">{actionText}</td>
                            <td className="border-b border-[#0ea5a4]/20 px-3 py-2">{offense}</td>
                            <td className="border-b border-[#0ea5a4]/20 px-3 py-2">{note}</td>
                          </tr>
                        );
                      })}
                      {masterStudent.logs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-3 text-center text-slate-500">
                            No logs yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
