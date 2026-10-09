"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  UserPlus, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Clock, 
  Briefcase, 
  Phone, 
  ShieldCheck, 
  PlusCircle, 
  RefreshCw, 
  Sun, 
  Sunset, 
  Moon,
  AlertTriangle,
  BadgeDollarSign,
  Pencil
} from "lucide-react";
import { formatRs, getTodayDatePK, formatDate } from "@/lib/formatters";
import { Employee, EmployeeDuty, Nozzle } from "@/lib/types";

export default function EmployeesPage() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDatePK());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [duties, setDuties] = useState<EmployeeDuty[]>([]);
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [shiftFilter, setShiftFilter] = useState<string>("All");

  // Modals
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [showAssignDutyModal, setShowAssignDutyModal] = useState(false);
  const [showEditEmpModal, setShowEditEmpModal] = useState(false);
  const [showEditDutyModal, setShowEditDutyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Add Employee Form State
  const [empName, setEmpName] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empDutyType, setEmpDutyType] = useState("Nozzle Operator (فلنگ سٹاف)");
  const [empSalary, setEmpSalary] = useState("32000");

  // Edit Employee Form State
  const [editEmpId, setEditEmpId] = useState<number | null>(null);
  const [editEmpName, setEditEmpName] = useState("");
  const [editEmpPhone, setEditEmpPhone] = useState("");
  const [editEmpDutyType, setEditEmpDutyType] = useState("Nozzle Operator (فلنگ سٹاف)");
  const [editEmpSalary, setEditEmpSalary] = useState("32000");
  const [editEmpStatus, setEditEmpStatus] = useState("Active");

  // Assign Duty Form State
  const [dutyEmpId, setDutyEmpId] = useState("");
  const [dutyShift, setDutyShift] = useState("Morning");
  const [dutyNozzle, setDutyNozzle] = useState("Nozzle 1 & 2 (Petrol)");
  const [dutyPresent, setDutyPresent] = useState(true);
  const [dutyNotes, setDutyNotes] = useState("");

  // Edit Duty Form State
  const [editDutyId, setEditDutyId] = useState<number | null>(null);
  const [editDutyEmpName, setEditDutyEmpName] = useState("");
  const [editDutyShift, setEditDutyShift] = useState("Morning");
  const [editDutyNozzle, setEditDutyNozzle] = useState("");
  const [editDutyPresent, setEditDutyPresent] = useState(true);
  const [editDutyNotes, setEditDutyNotes] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      // Fetch employees
      const empRes = await fetch("/api/employees");
      const empData = await empRes.json();
      if (empData.success) {
        setEmployees(empData.employees || []);
        if (empData.employees?.length > 0 && !dutyEmpId) {
          setDutyEmpId(empData.employees[0].id.toString());
        }
      }

      // Fetch duties for selected date
      const dutyRes = await fetch(`/api/employees/duty?date=${selectedDate}`);
      const dutyData = await dutyRes.json();
      if (dutyData.success) {
        setDuties(dutyData.duties || []);
        setNozzles(dutyData.nozzles || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Handle Add Employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empPhone) return;

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: empName,
          phone: empPhone,
          duty_type: empDutyType,
          salary: parseFloat(empSalary) || 0,
          status: "Active",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add employee");

      setSuccessMsg("نیا ملازم کامیابی سے شامل کر لیا گیا!");
      setTimeout(() => setSuccessMsg(""), 4000);
      setShowAddEmpModal(false);
      setEmpName("");
      setEmpPhone("");
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error adding employee");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Assign Duty
  const handleAssignDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dutyEmpId) return;

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch("/api/employees/duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          employee_id: parseInt(dutyEmpId),
          shift: dutyShift,
          nozzle_assigned: dutyNozzle,
          present: dutyPresent ? 1 : 0,
          notes: dutyNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign duty");

      setSuccessMsg("ڈیوٹی کامیابی سے تفویض کر دی گئی!");
      setTimeout(() => setSuccessMsg(""), 4000);
      setShowAssignDutyModal(false);
      setDutyNotes("");
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error assigning duty");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Attendance
  const handleTogglePresent = async (dutyId: number, currentPresent: number) => {
    try {
      const res = await fetch("/api/employees/duty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dutyId,
          present: currentPresent === 1 ? 0 : 1,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("Attendance toggle error:", err);
    }
  };

  // Open Edit Employee Modal
  const openEditEmpModal = (emp: Employee) => {
    setEditEmpId(emp.id);
    setEditEmpName(emp.name);
    setEditEmpPhone(emp.phone);
    setEditEmpDutyType(emp.duty_type);
    setEditEmpSalary(emp.salary?.toString() || "0");
    setEditEmpStatus(emp.status || "Active");
    setShowEditEmpModal(true);
  };

  // Submit Update Employee
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmpId || !editEmpName || !editEmpPhone) return;

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editEmpId,
          name: editEmpName,
          phone: editEmpPhone,
          duty_type: editEmpDutyType,
          salary: parseFloat(editEmpSalary) || 0,
          status: editEmpStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update employee");

      setSuccessMsg("ملازم کی معلومات کامیابی سے اپ ڈیٹ ہو گئیں!");
      setTimeout(() => setSuccessMsg(""), 4000);
      setShowEditEmpModal(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error updating employee");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Duty Modal
  const openEditDutyModal = (duty: EmployeeDuty) => {
    setEditDutyId(duty.id);
    setEditDutyEmpName(duty.employeeName || `Employee #${duty.employee_id}`);
    setEditDutyShift(duty.shift || "Morning");
    setEditDutyNozzle(duty.nozzle_assigned || "");
    setEditDutyPresent(duty.present === 1);
    setEditDutyNotes(duty.notes || "");
    setShowEditDutyModal(true);
  };

  // Submit Update Duty
  const handleUpdateDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDutyId) return;

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch("/api/employees/duty", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editDutyId,
          shift: editDutyShift,
          nozzle_assigned: editDutyNozzle,
          present: editDutyPresent ? 1 : 0,
          notes: editDutyNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update duty");

      setSuccessMsg("ڈیوٹی کی تفصیلات کامیابی سے اپ ڈیٹ ہو گئیں!");
      setTimeout(() => setSuccessMsg(""), 4000);
      setShowEditDutyModal(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error updating duty");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Duty
  const handleDeleteDuty = async (id: number) => {
    if (!confirm("کیا آپ واقعی یہ ڈیوٹی انٹری حذف کرنا چاہتے ہیں؟")) return;
    try {
      const res = await fetch(`/api/employees/duty?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error("Duty delete error:", err);
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (id: number) => {
    if (!confirm("کیا آپ واقعی اس ملازم کا ریکارڈ حذف کرنا چاہتے ہیں؟")) return;
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error("Employee delete error:", err);
    }
  };

  // Filter duties by shift
  const filteredDuties = shiftFilter === "All"
    ? duties
    : duties.filter((d) => d.shift === shiftFilter);

  // Counts
  const morningCount = duties.filter((d) => d.shift === "Morning").length;
  const eveningCount = duties.filter((d) => d.shift === "Evening").length;
  const nightCount = duties.filter((d) => d.shift === "Night").length;
  const presentCount = duties.filter((d) => d.present === 1).length;
  const absentCount = duties.filter((d) => d.present === 0).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-blue-100 text-blue-700">
              <Users className="w-6 h-6" />
            </span>
            <span>ملازمین اور روزانہ ڈیوٹی روسٹر</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Employee Duty</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            عملے کا اندراج، ماہانہ تنخواہ، نوزل تفویض اور روزانہ شفٹ حاضری روسٹر (DD-MM-YYYY)
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 shadow-sm">
            <Calendar className="w-4 h-4 text-blue-600" />
            <input
              type="text"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="DD-MM-YYYY"
              className="bg-transparent text-slate-900 text-xs font-bold font-mono focus:outline-none w-28 text-center"
            />
          </div>

          <button
            onClick={() => setShowAddEmpModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 text-xs font-bold shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>نیا ملازم (Add Employee)</span>
          </button>

          <button
            onClick={() => setShowAssignDutyModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-900/20 transition-all hover:scale-102"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ڈیوٹی لگائیں (Assign Duty)</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4 SUMMARY CARDS: SHIFT STATS & ATTENDANCE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Morning Shift */}
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-amber-100 rounded-2xl p-5 border-l-4 border-l-amber-500 border border-amber-200/60 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-900 uppercase">صبح کی شفٹ (Morning)</span>
            <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
              <Sun className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono mt-2">{morningCount} عملہ</div>
          <div className="text-[11px] text-amber-800 font-medium mt-1">08:00 AM - 04:00 PM</div>
        </div>

        {/* Evening Shift */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 rounded-2xl p-5 border-l-4 border-l-blue-500 border border-blue-200/60 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-blue-900 uppercase">شام کی شفٹ (Evening)</span>
            <div className="w-10 h-10 rounded-xl bg-blue-200 text-blue-800 flex items-center justify-center shadow-xs">
              <Sunset className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-950 font-mono mt-2">{eveningCount} عملہ</div>
          <div className="text-[11px] text-blue-800 font-medium mt-1">04:00 PM - 12:00 AM</div>
        </div>

        {/* Night Shift */}
        <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-violet-100 rounded-2xl p-5 border-l-4 border-l-purple-500 border border-purple-200/60 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-purple-900 uppercase">رات کی شفٹ (Night)</span>
            <div className="w-10 h-10 rounded-xl bg-purple-200 text-purple-800 flex items-center justify-center shadow-xs">
              <Moon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-950 font-mono mt-2">{nightCount} عملہ</div>
          <div className="text-[11px] text-purple-800 font-medium mt-1">12:00 AM - 08:00 AM</div>
        </div>

        {/* Attendance Summary */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 rounded-2xl p-5 border-l-4 border-l-emerald-500 border border-emerald-200/60 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-900 uppercase">حاضری رپورٹ</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-bold text-slate-900 flex items-center gap-2 mt-3">
            <span className="text-emerald-800 font-mono text-xl font-black">{presentCount} حاضر</span>
            <span className="text-slate-400">•</span>
            <span className="text-rose-700 font-mono text-base font-black">{absentCount} غیر حاضر</span>
          </div>
          <div className="text-[11px] text-emerald-800 font-medium mt-1">روزانہ تصدیق شدہ</div>
        </div>
      </div>

      {/* TABLE 1: DAILY DUTY ASSIGNMENT ROSTER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="p-4 sm:p-5 bg-blue-50/70 border-b border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-600" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-blue-950">
                روزانہ ڈیوٹی شیٹ ({selectedDate})
              </h2>
              <p className="text-xs text-blue-800 font-medium">
                ملازم کا نام، شفٹ، تفویض کردہ نوزل اور حاضری
              </p>
            </div>
          </div>

          {/* Shift Filter Pills */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-blue-200 shadow-2xs">
            {["All", "Morning", "Evening", "Night"].map((s) => (
              <button
                key={s}
                onClick={() => setShiftFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  shiftFilter === s
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {s === "All" ? "تمام شفٹس" : s === "Morning" ? "صبح" : s === "Evening" ? "شام" : "رات"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Employee Name</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Role / Duty</th>
                <th className="py-3 px-3">Shift</th>
                <th className="py-3 px-3">Nozzle Assigned</th>
                <th className="py-3 px-3 text-center">Attendance Status</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filteredDuties.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    اس تاریخ ({selectedDate}) کی کوئی ڈیوٹی تفویض نہیں ہے۔ اوپر بٹن سے ڈیوٹی لگائیں۔
                  </td>
                </tr>
              ) : (
                filteredDuties.map((row) => {
                  let shiftBadge = "bg-amber-100 text-amber-800 border-amber-300";
                  if (row.shift === "Evening") shiftBadge = "bg-indigo-100 text-indigo-800 border-indigo-300";
                  if (row.shift === "Night") shiftBadge = "bg-purple-100 text-purple-800 border-purple-300";

                  const isPresent = row.present === 1;

                  return (
                    <tr key={row.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatDate(row.date)}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {row.employeeName || "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.employeePhone || "—"}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {row.duty_type || "—"}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${shiftBadge}`}>
                          {row.shift === "Morning" ? "🌅 Morning (صبح)" : row.shift === "Evening" ? "🌇 Evening (شام)" : "🌙 Night (رات)"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-blue-900 whitespace-nowrap">
                        {row.nozzle_assigned || "All Island"}
                      </td>
                      {/* Attendance Toggle */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePresent(row.id, row.present)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs transition-all hover:scale-105 ${
                            isPresent
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200"
                              : "bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
                          }`}
                        >
                          {isPresent ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>حاضر (Present)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>غیر حاضر (Absent)</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        {row.notes || "—"}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditDutyModal(row)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="ترمیم کریں (Edit Duty)"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDuty(row.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="حذف کریں"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: EMPLOYEES MASTER DIRECTORY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-slate-200 text-slate-700">
              <Briefcase className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                پٹرول پمپ ملازمین کی مستقل فہرست (Staff Directory)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                ملازمین کا فون نمبر، عہدہ، اور ماہانہ مقررہ تنخواہ
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-white px-3 py-1 rounded-full text-slate-800 border border-slate-300 shadow-xs">
            {employees.length} Staff Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Duty Type / Role</th>
                <th className="py-3 px-4 text-right">Monthly Salary (تنخواہ)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    کوئی ملازم موجود نہیں ہے۔ نیا ملازم شامل کریں۔
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">#{emp.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {emp.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {emp.phone}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {emp.duty_type}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                      {formatRs(emp.salary)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditEmpModal(emp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="ترمیم کریں (Edit Employee)"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="حذف کریں"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ASSIGN DUTY */}
      {showAssignDutyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <PlusCircle className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  شفٹ ڈیوٹی تفویض کریں
                </h3>
              </div>
              <button
                onClick={() => setShowAssignDutyModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignDuty} className="space-y-4 mt-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  تاریخ (Date - DD-MM-YYYY)
                </label>
                <input
                  type="text"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-blue-500 font-mono"
                />
              </div>

              {/* Select Employee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ملازم منتخب کریں (Select Employee)
                </label>
                <select
                  value={dutyEmpId}
                  onChange={(e) => setDutyEmpId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-blue-500 bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.duty_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  شفٹ (Shift)
                </label>
                <select
                  value={dutyShift}
                  onChange={(e) => setDutyShift(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                >
                  <option value="Morning">Morning (صبح کی شفٹ - 08:00 AM to 04:00 PM)</option>
                  <option value="Evening">Evening (شام کی شفٹ - 04:00 PM to 12:00 AM)</option>
                  <option value="Night">Night (رات کی شفٹ - 12:00 AM to 08:00 AM)</option>
                </select>
              </div>

              {/* Nozzle Assigned */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  تفویض کردہ نوزل (Nozzle Assigned)
                </label>
                <input
                  type="text"
                  value={dutyNozzle}
                  onChange={(e) => setDutyNozzle(e.target.value)}
                  placeholder="e.g. Nozzle 1 & 2 (Petrol)"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:border-blue-500"
                />
              </div>

              {/* Present / Absent Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="presentCheck"
                  checked={dutyPresent}
                  onChange={(e) => setDutyPresent(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
                />
                <label htmlFor="presentCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  حاضر ہے (Mark as Present today)
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  نوٹس (Optional Notes)
                </label>
                <input
                  type="text"
                  value={dutyNotes}
                  onChange={(e) => setDutyNotes(e.target.value)}
                  placeholder="مثلاً: اوور ٹائم، خصوصی ڈیوٹی"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignDutyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-900/30 transition-all hover:scale-102 disabled:opacity-50"
                >
                  {submitting ? "محفوظ ہو رہا ہے..." : "ڈیوٹی لگائیں (Save Duty)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD EMPLOYEE */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <UserPlus className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  نیا ملازم شامل کریں
                </h3>
              </div>
              <button
                onClick={() => setShowAddEmpModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  پورا نام (Employee Name)
                </label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Muhammad Aslam"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  موبائل نمبر (Phone Number)
                </label>
                <input
                  type="text"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ڈیوٹی کی قسم / عہدہ (Duty Type)
                </label>
                <select
                  value={empDutyType}
                  onChange={(e) => setEmpDutyType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                >
                  <option value="Nozzle Operator (فلنگ سٹاف)">Nozzle Operator (فلنگ سٹاف)</option>
                  <option value="Manager / کیشیئر">Manager / کیشیئر</option>
                  <option value="Night Incharge (رات کا انچارج)">Night Incharge (رات کا انچارج)</option>
                  <option value="Security Guard (سیکیورٹی گارڈ)">Security Guard (سیکیورٹی گارڈ)</option>
                  <option value="Cleaner / صفائی عملہ">Cleaner / صفائی عملہ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ماہانہ تنخواہ روپے (Monthly Salary PKR)
                </label>
                <input
                  type="number"
                  value={empSalary}
                  onChange={(e) => setEmpSalary(e.target.value)}
                  placeholder="30000"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-black text-slate-900 focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-900/30 transition-all hover:scale-102 disabled:opacity-50"
                >
                  {submitting ? "محفوظ ہو رہا ہے..." : "ملازم محفوظ کریں (Save)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT EMPLOYEE */}
      {showEditEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Pencil className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  ملازم کے کوائف میں ترمیم (Edit Employee)
                </h3>
              </div>
              <button
                onClick={() => setShowEditEmpModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ملازم کا نام (Employee Name)
                </label>
                <input
                  type="text"
                  value={editEmpName}
                  onChange={(e) => setEditEmpName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  موبائل نمبر (Phone Number)
                </label>
                <input
                  type="text"
                  value={editEmpPhone}
                  onChange={(e) => setEditEmpPhone(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ڈیوٹی کی قسم / عہدہ (Duty Type)
                </label>
                <select
                  value={editEmpDutyType}
                  onChange={(e) => setEditEmpDutyType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                >
                  <option value="Nozzle Operator (فلنگ سٹاف)">Nozzle Operator (فلنگ سٹاف)</option>
                  <option value="Manager / کیشیئر">Manager / کیشیئر</option>
                  <option value="Night Incharge (رات کا انچارج)">Night Incharge (رات کا انچارج)</option>
                  <option value="Security Guard (سیکیورٹی گارڈ)">Security Guard (سیکیورٹی گارڈ)</option>
                  <option value="Cleaner / صفائی عملہ">Cleaner / صفائی عملہ</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ماہانہ تنخواہ (Salary PKR)
                  </label>
                  <input
                    type="number"
                    value={editEmpSalary}
                    onChange={(e) => setEditEmpSalary(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-black text-slate-900 focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    حالت (Status)
                  </label>
                  <select
                    value={editEmpStatus}
                    onChange={(e) => setEditEmpStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                  >
                    <option value="Active">Active (فعال)</option>
                    <option value="Inactive">Inactive (غیر فعال)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditEmpModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-900/30 transition-all hover:scale-102 disabled:opacity-50"
                >
                  {submitting ? "محفوظ ہو رہا ہے..." : "تبدیلی محفوظ کریں (Save Changes)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DUTY */}
      {showEditDutyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Pencil className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    ڈیوٹی تفویض میں ترمیم (Edit Duty)
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">{editDutyEmpName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditDutyModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateDuty} className="space-y-4 mt-4">
              {/* Shift */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  شفٹ منتخب کریں (Shift)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "Morning", label: "🌅 صبح (Morning)" },
                    { id: "Evening", label: "🌇 شام (Evening)" },
                    { id: "Night", label: "🌙 رات (Night)" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEditDutyShift(s.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                        editDutyShift === s.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nozzle / Station */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  نوزل یا کاؤنٹر تفویض (Assigned Nozzle)
                </label>
                <input
                  type="text"
                  value={editDutyNozzle}
                  onChange={(e) => setEditDutyNozzle(e.target.value)}
                  placeholder="e.g. Nozzle 1 & 2 (Petrol), Cash Counter"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:border-blue-500"
                />
              </div>

              {/* Attendance Present/Absent */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  حاضری (Attendance)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditDutyPresent(true)}
                    className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                      editDutyPresent
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حاضر (Present)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDutyPresent(false)}
                    className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                      !editDutyPresent
                        ? "bg-red-600 text-white border-red-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>غیر حاضر (Absent)</span>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  خصوصی نوٹ (Notes)
                </label>
                <input
                  type="text"
                  value={editDutyNotes}
                  onChange={(e) => setEditDutyNotes(e.target.value)}
                  placeholder="اوور ٹائم، چھٹی یا کوئی ہدایات"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditDutyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-900/30 transition-all hover:scale-102 disabled:opacity-50"
                >
                  {submitting ? "محفوظ ہو رہا ہے..." : "تبدیلی محفوظ کریں (Save Changes)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
