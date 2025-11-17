import React, { useEffect, useState } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHIFTS = [
  { key: "morning", label: "Morning Shift" },
  { key: "afternoon", label: "Afternoon Shift" },
  { key: "night", label: "Night Shift + Ward Round" },
];

const LOCAL_KEY = "stmartin-roster-v1";

function defaultEmptyRoster() {
  const roster = {};
  DAYS.forEach((day) => {
    roster[day] = {};
    SHIFTS.forEach((s) => (roster[day][s.key] = []));
  });
  return roster;
}

function getCapacity(day, shiftKey) {
  if (shiftKey === "morning") {
    if (day === "Saturday" || day === "Sunday") return 1;
    return 2;
  }
  return 1;
}

function slotColor(applicants, capacity) {
  if (applicants.length === 0) return "bg-green-200";
  if (applicants.length > capacity) return "bg-pink-300";
  return "bg-yellow-300";
}

export default function StMartinsRoster() {
  const [roster, setRoster] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse saved roster, creating new one.");
    }
    return defaultEmptyRoster();
  });

  const [modal, setModal] = useState({ open: false, day: null, shift: null });
  const [form, setForm] = useState({ name: "", phone: "" });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(roster));
    } catch (e) {
      console.error("Failed to save roster", e);
    }
  }, [roster]);

  function openSlot(day, shiftKey) {
    setForm({ name: "", phone: "" });
    setModal({ open: true, day, shift: shiftKey });
  }

  function addApplicant() {
    const { day, shift } = modal;
    if (!day || !shift) return;
    if (!form.name.trim() || !form.phone.trim()) return alert("Please provide name and phone number.");

    setRoster((r) => {
      const copy = JSON.parse(JSON.stringify(r));
      copy[day][shift].push({ name: form.name.trim(), phone: form.phone.trim(), ts: Date.now() });
      return copy;
    });

    setForm({ name: "", phone: "" });
  }

  function removeApplicant(day, shift, idx) {
    setRoster((r) => {
      const copy = JSON.parse(JSON.stringify(r));
      copy[day][shift].splice(idx, 1);
      return copy;
    });
  }

  function exportJSON() {
    const dataStr = JSON.stringify(roster, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stmartin_roster.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        setRoster(parsed);
      } catch (err) {
        alert("Failed to import JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  function firstNNames(slotList, capacity) {
    return slotList.slice(0, capacity).map((s) => s.name);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">St Martin's Memorial Hospital — Dansoman</h1>
        <p className="text-sm text-gray-600">Editable weekly duty roster. Click any slot to apply or view applicants.</p>
      </header>

      <div className="mb-4 flex gap-2">
        <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={exportJSON}>Export JSON</button>
        <label className="px-3 py-1 rounded bg-gray-200 cursor-pointer">
          Import JSON
          <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files && importJSON(e.target.files[0])} />
        </label>
        <button
          className="px-3 py-1 rounded bg-red-100 text-red-700"
          onClick={() => {
            if (confirm("Reset roster to empty? This will clear all data in this browser.")) {
              const empty = defaultEmptyRoster();
              setRoster(empty);
            }
          }}
        >
          Reset
        </button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              <th className="w-44 border-r p-2"></th>
              {SHIFTS.map((s) => (
                <th key={s.key} className="p-2 text-left">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-r p-0" colSpan={1}>
                <div className="w-44 h-24 flex items-center justify-center">
                  <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="none">
                    <polygon points="0,0 200,0 0,100" fill="#e6f7ea" />
                    <polygon points="200,0 200,100 0,100" fill="#eef2ff" />
                    <text x="22" y="30" fontSize="12" fill="#0f172a">Days</text>
                    <text x="110" y="78" fontSize="11" fill="#0f172a">Shifts</text>
                  </svg>
                </div>
              </td>
              {SHIFTS.map((s) => (
                <td key={s.key} className="p-2 border-l"></td>
              ))}
            </tr>

            {DAYS.map((day) => (
              <tr key={day} className="h-20">
                <td className="border-r p-2 align-top font-medium">{day}</td>
                {SHIFTS.map((s) => {
                  const applicants = roster[day][s.key] || [];
                  const capacity = getCapacity(day, s.key);
                  const colorClass = slotColor(applicants, capacity);
                  const visibleNames = firstNNames(applicants, capacity);

                  return (
                    <td key={s.key} className={`p-2 align-top border-l`}>
                      <div className={`h-20 rounded p-2 cursor-pointer flex flex-col justify-between ${colorClass}`} onClick={() => openSlot(day, s.key)}>
                        <div className="text-xs font-semibold">{s.label}</div>
                        <div className="text-sm mt-2">
                          {applicants.length === 0 ? (
                            <span className="opacity-80">Available</span>
                          ) : (
                            <div>
                              {visibleNames.map((n, i) => (
                                <div key={i} className="truncate">{n}</div>
                              ))}
                              {applicants.length > capacity && (
                                <div className="text-xs italic opacity-80">+{applicants.length - capacity} on call</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] opacity-70">Click to view / join</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded w-full max-w-2xl p-4 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">{modal.day} — {SHIFTS.find(s=>s.key===modal.shift)?.label}</h2>
              <div>
                <button className="px-3 py-1 bg-gray-100 rounded" onClick={() => setModal({ open: false, day: null, shift: null })}>Close</button>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Applicants (first shown names are the ones occupying the slot visibly). Click remove to delete an entry.</div>
              <div className="space-y-2 max-h-40 overflow-auto">
                {roster[modal.day][modal.shift].length === 0 && <div className="p-2 bg-gray-50 rounded">No applicants yet.</div>}
                {roster[modal.day][modal.shift].map((a, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded border">
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-sm text-gray-600">{a.phone}</div>
                    </div>
                    <div>
                      <button className="text-sm text-red-600" onClick={() => { if (confirm(`Remove ${a.name}?`)) removeApplicant(modal.day, modal.shift, idx); }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <h3 className="font-medium mb-2">Join this slot</h3>
              <div className="grid grid-cols-2 gap-2">
                <input value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} placeholder="Your name" className="p-2 border rounded" />
                <input value={form.phone} onChange={(e)=>setForm(f=>({...f,phone:e.target.value}))} placeholder="Phone number" className="p-2 border rounded" />
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={addApplicant}>Apply / Add</button>
                <button className="px-3 py-1 bg-gray-100 rounded" onClick={()=>{setForm({name:'',phone:''})}}>Clear</button>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-600">
              Capacity: {getCapacity(modal.day, modal.shift)} — Current: {roster[modal.day][modal.shift].length}
            </div>
          </div>
        </div>
      )}

      <footer className="mt-6 text-xs text-gray-500">
        Tip: To make this collaborative across users, set up a simple Realtime DB (Firebase / Supabase) and replace localStorage read/write with remote reads + onSnapshot listeners.
      </footer>
    </div>
  );
}
