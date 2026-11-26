import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";

const uid = () => crypto.randomUUID();

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((amount || 0) / 100);

const initialGroups = [];

function App() {
  const [groups, setGroups] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("expense-tracker-groups")) || initialGroups;
    } catch {
      return initialGroups;
    }
  });

  const [activeId, setActiveId] = useState(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [memberNames, setMemberNames] = useState("");
  const [newMember, setNewMember] = useState("");
  const [search, setSearch] = useState("");

  const activeGroup = groups.find((g) => g.id === activeId) || groups[0];

  useEffect(() => {
    localStorage.setItem("expense-tracker-groups", JSON.stringify(groups));
  }, [groups]);

  function updateGroup(callback) {
    if (!activeGroup) return;
    setGroups((old) =>
      old.map((g) => (g.id === activeGroup.id ? callback(g) : g))
    );
  }

  function createGroup(e) {
    e.preventDefault();
    const names = memberNames
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    if (!groupName.trim() || names.length === 0) {
      alert("Group name aur kam se kam ek member add karo.");
      return;
    }

    const group = {
      id: uid(),
      name: groupName.trim(),
      members: names.map((name) => ({ id: uid(), name })),
      expenses: [],
      settlements: [],
    };

    setGroups((old) => [...old, group]);
    setActiveId(group.id);
    setGroupName("");
    setMemberNames("");
    setShowGroupForm(false);
  }

  function addMember(e) {
    e.preventDefault();
    if (!newMember.trim()) return;

    updateGroup((g) => ({
      ...g,
      members: [...g.members, { id: uid(), name: newMember.trim() }],
    }));
    setNewMember("");
  }

  function deleteGroup() {
    if (!activeGroup || !confirm("Is group ko delete karna hai?")) return;
    setGroups((old) => old.filter((g) => g.id !== activeGroup.id));
    setActiveId(null);
  }

  function saveExpense(expense) {
    updateGroup((g) => {
      const expenses = editingExpense
        ? g.expenses.map((e) => (e.id === expense.id ? expense : e))
        : [...g.expenses, expense];

      return { ...g, expenses };
    });

    setShowExpenseForm(false);
    setEditingExpense(null);
  }

  function deleteExpense(id) {
    if (!confirm("Ye expense delete karna hai?")) return;
    updateGroup((g) => ({
      ...g,
      expenses: g.expenses.filter((e) => e.id !== id),
    }));
  }

  function recordSettlement(from, to, amount) {
    if (amount <= 0) return;
    updateGroup((g) => ({
      ...g,
      settlements: [
        ...g.settlements,
        { id: uid(), from, to, amount, date: new Date().toISOString() },
      ],
    }));
  }

  const balances = useMemo(() => {
    if (!activeGroup) return {};

    const result = {};
    activeGroup.members.forEach((m) => (result[m.id] = 0));

    activeGroup.expenses.forEach((expense) => {
      result[expense.paidBy] =
        (result[expense.paidBy] || 0) + expense.amount;

      expense.splits.forEach((split) => {
        result[split.member] =
          (result[split.member] || 0) - split.amount;
      });
    });

    activeGroup.settlements.forEach((s) => {
      result[s.from] = (result[s.from] || 0) + s.amount;
      result[s.to] = (result[s.to] || 0) - s.amount;
    });

    return result;
  }, [activeGroup]);

  const totalExpenses = activeGroup
    ? activeGroup.expenses.reduce((sum, e) => sum + e.amount, 0)
    : 0;

  const filteredExpenses = activeGroup
    ? [...activeGroup.expenses]
        .filter((e) =>
          e.description.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  function openAddExpense() {
    setEditingExpense(null);
    setShowExpenseForm(true);
  }

  function openEditExpense(expense) {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  }

  const memberName = (id) =>
    activeGroup?.members.find((m) => m.id === id)?.name || "Unknown";

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>SplitMate</h1>
          <p>Shared expenses, made simple.</p>
        </div>
        <button className="primary" onClick={() => setShowGroupForm(true)}>
          + Create Group
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <h3>Your Groups</h3>
          {groups.length === 0 && <p className="muted">Abhi koi group nahi hai.</p>}

          {groups.map((g) => (
            <button
              key={g.id}
              className={`group-button ${activeGroup?.id === g.id ? "selected" : ""}`}
              onClick={() => setActiveId(g.id)}
            >
              <span className="group-avatar">{g.name[0].toUpperCase()}</span>
              <span>{g.name}</span>
            </button>
          ))}
        </aside>

        <main className="content">
          {!activeGroup ? (
            <div className="empty">
              <h2>Welcome to SplitMate</h2>
              <p>Apna pehla group banao aur expenses track karna shuru karo.</p>
              <button className="primary" onClick={() => setShowGroupForm(true)}>
                Create your first group
              </button>
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <h2>{activeGroup.name}</h2>
                  <p>{activeGroup.members.length} members</p>
                </div>
                <div className="actions">
                  <button className="secondary" onClick={openAddExpense}>
                    + Add Expense
                  </button>
                  <button className="danger-outline" onClick={deleteGroup}>
                    Delete Group
                  </button>
                </div>
              </div>

              <section className="stats">
                <div className="stat-card">
                  <span>Total group expenses</span>
                  <strong>{money(totalExpenses)}</strong>
                </div>
                <div className="stat-card">
                  <span>Total expenses</span>
                  <strong>{activeGroup.expenses.length}</strong>
                </div>
                <div className="stat-card">
                  <span>Members</span>
                  <strong>{activeGroup.members.length}</strong>
                </div>
              </section>

              <section className="panel">
                <h3>Member Balances</h3>
                <div className="balance-grid">
                  {activeGroup.members.map((m) => {
                    const balance = balances[m.id] || 0;
                    return (
                      <div className="balance-card" key={m.id}>
                        <div className="member-avatar">{m.name[0].toUpperCase()}</div>
                        <div>
                          <strong>{m.name}</strong>
                          <p className={balance >= 0 ? "positive" : "negative"}>
                            {balance > 0
                              ? `Gets back ${money(balance)}`
                              : balance < 0
                              ? `Owes ${money(Math.abs(balance))}`
                              : "Settled up"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="panel">
                <div className="section-heading">
                  <h3>Expenses</h3>
                  <input
                    className="search"
                    placeholder="Search expenses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {filteredExpenses.length === 0 ? (
                  <p className="muted">Abhi koi expense nahi hai.</p>
                ) : (
                  <div className="expense-list">
                    {filteredExpenses.map((e) => (
                      <div className="expense-row" key={e.id}>
                        <div className="expense-icon">₹</div>
                        <div className="expense-info">
                          <strong>{e.description}</strong>
                          <p>
                            Paid by {memberName(e.paidBy)} ·{" "}
                            {new Date(e.date).toLocaleDateString("en-IN")}
                          </p>
                          <small>
                            {e.splitType === "custom" ? "Custom split" : "Equal split"}
                          </small>
                        </div>
                        <strong className="expense-amount">{money(e.amount)}</strong>
                        <button
                          className="small-button"
                          onClick={() => openEditExpense(e)}
                        >
                          Edit
                        </button>
                        <button
                          className="small-button delete"
                          onClick={() => deleteExpense(e.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel">
                <h3>Group Members</h3>
                <div className="member-list">
                  {activeGroup.members.map((m) => (
                    <span className="member-chip" key={m.id}>{m.name}</span>
                  ))}
                </div>
                <form className="add-member-form" onSubmit={addMember}>
                  <input
                    placeholder="New member name"
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                  />
                  <button className="secondary">Add Member</button>
                </form>
              </section>

              <SettlementPanel
                group={activeGroup}
                balances={balances}
                memberName={memberName}
                onSettle={recordSettlement}
              />
            </>
          )}
        </main>
      </div>

      {showGroupForm && (
        <Modal title="Create New Group" onClose={() => setShowGroupForm(false)}>
          <form onSubmit={createGroup} className="form">
            <label>Group name</label>
            <input
              placeholder="e.g. Goa Trip"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
            <label>Members (comma separated)</label>
            <textarea
              placeholder="e.g. Rahul, Priya, Aman"
              value={memberNames}
              onChange={(e) => setMemberNames(e.target.value)}
              required
            />
            <button className="primary">Create Group</button>
          </form>
        </Modal>
      )}

      {showExpenseForm && activeGroup && (
        <ExpenseForm
          group={activeGroup}
          expense={editingExpense}
          onSave={saveExpense}
          onClose={() => {
            setShowExpenseForm(false);
            setEditingExpense(null);
          }}
        />
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ExpenseForm({ group, expense, onSave, onClose }) {
  const [description, setDescription] = useState(expense?.description || "");
  const [amount, setAmount] = useState(
    expense ? (expense.amount / 100).toString() : ""
  );
  const [paidBy, setPaidBy] = useState(
    expense?.paidBy || group.members[0]?.id || ""
  );
  const [date, setDate] = useState(
    expense?.date
      ? new Date(expense.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [splitType, setSplitType] = useState(expense?.splitType || "equal");
  const [selected, setSelected] = useState(
    expense?.splits.map((s) => s.member) || group.members.map((m) => m.id)
  );
  const [customAmounts, setCustomAmounts] = useState(() => {
    const result = {};
    expense?.splits.forEach((s) => {
      result[s.member] = (s.amount / 100).toString();
    });
    return result;
  });

  const amountPaise = Math.round(Number(amount) * 100);
  const selectedTotal = selected.reduce(
    (sum, id) => sum + Math.round(Number(customAmounts[id] || 0) * 100),
    0
  );

  function toggleMember(id) {
    setSelected((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id]
    );
  }

  function submit(e) {
    e.preventDefault();

    if (!description.trim() || !Number.isFinite(amountPaise) || amountPaise <= 0) {
      alert("Description aur valid amount enter karo.");
      return;
    }

    if (selected.length === 0) {
      alert("Kam se kam ek member select karo.");
      return;
    }

    let splits = [];

    if (splitType === "equal") {
      const base = Math.floor(amountPaise / selected.length);
      let remainder = amountPaise - base * selected.length;

      splits = selected.map((member) => {
        const share = base + (remainder > 0 ? 1 : 0);
        remainder = Math.max(0, remainder - 1);
        return { member, amount: share };
      });
    } else {
      if (selectedTotal !== amountPaise) {
        alert(
          `Custom split ka total ${money(selectedTotal)} hai. Expense amount ${money(amountPaise)} hona chahiye.`
        );
        return;
      }

      splits = selected.map((member) => ({
        member,
        amount: Math.round(Number(customAmounts[member] || 0) * 100),
      }));
    }

    onSave({
      id: expense?.id || uid(),
      description: description.trim(),
      amount: amountPaise,
      paidBy,
      date: new Date(`${date}T12:00:00`).toISOString(),
      splitType,
      splits,
    });
  }

  return (
    <Modal title={expense ? "Edit Expense" : "Add Expense"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Expense description</label>
        <input
          placeholder="e.g. Dinner, Hotel, Taxi"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <label>Amount (₹)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <label>Paid by</label>
        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          {group.members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <label>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <label>Split type</label>
        <select value={splitType} onChange={(e) => setSplitType(e.target.value)}>
          <option value="equal">Split equally</option>
          <option value="custom">Custom amounts</option>
        </select>

        <label>Split between</label>
        <div className="split-members">
          {group.members.map((m) => (
            <div className="split-member" key={m.id}>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => toggleMember(m.id)}
                />
                {m.name}
              </label>

              {splitType === "custom" && selected.includes(m.id) && (
                <input
                  className="share-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="₹ share"
                  value={customAmounts[m.id] || ""}
                  onChange={(e) =>
                    setCustomAmounts((old) => ({
                      ...old,
                      [m.id]: e.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
        </div>

        {splitType === "custom" && (
          <div className="split-total">
            Split total: <strong>{money(selectedTotal)}</strong>
            <span> / {money(amountPaise)}</span>
          </div>
        )}

        <button className="primary">
          {expense ? "Save Changes" : "Add Expense"}
        </button>
      </form>
    </Modal>
  );
}

function SettlementPanel({ group, balances, memberName, onSettle }) {
  const debtors = group.members
    .filter((m) => (balances[m.id] || 0) < 0)
    .map((m) => ({ ...m, remaining: -balances[m.id] }));

  const creditors = group.members
    .filter((m) => (balances[m.id] || 0) > 0)
    .map((m) => ({ ...m, remaining: balances[m.id] }));

  const suggestions = [];
  let i = 0;
  let j = 0;

  const ds = debtors.map((m) => ({ ...m }));
  const cs = creditors.map((m) => ({ ...m }));

  while (i < ds.length && j < cs.length) {
    const amount = Math.min(ds[i].remaining, cs[j].remaining);

    if (amount > 0) {
      suggestions.push({
        from: ds[i].id,
        to: cs[j].id,
        amount,
      });
    }

    ds[i].remaining -= amount;
    cs[j].remaining -= amount;

    if (ds[i].remaining < 1) i++;
    if (cs[j].remaining < 1) j++;
  }

  return (
    <section className="panel">
      <h3>Suggested Settlements</h3>
      {suggestions.length === 0 ? (
        <p className="muted">Sab members settled up hain.</p>
      ) : (
        suggestions.map((s, index) => (
          <div className="settlement-row" key={index}>
            <p>
              <strong>{memberName(s.from)}</strong> pays{" "}
              <strong>{memberName(s.to)}</strong>{" "}
              <strong>{money(s.amount)}</strong>
            </p>
            <button
              className="secondary"
              onClick={() => {
                if (confirm("Settlement record karna hai?")) {
                  onSettle(s.from, s.to, s.amount);
                }
              }}
            >
              Mark as paid
            </button>
          </div>
        ))
      )}

      {group.settlements.length > 0 && (
        <>
          <h4>Recorded Settlements</h4>
          {group.settlements.map((s) => (
            <p className="muted" key={s.id}>
              {memberName(s.from)} paid {memberName(s.to)} {money(s.amount)}
            </p>
          ))}
        </>
      )}
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);