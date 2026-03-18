<script>
  import { onMount } from 'svelte';
  import {
    getExpenses, addExpense, updateExpense, deleteExpense,
    getIncome, addIncome, updateIncome, deleteIncome,
    getCategories, getProperties, getAccounts
  } from '$lib/stores/data';
  import { user } from '$lib/stores/auth';
  import Modal from '$lib/components/Modal.svelte';
  import { format } from 'date-fns';

  let expenses = [];
  let incomes = [];
  let properties = [];
  let accounts = [];
  let expenseCategories = [];
  let incomeCategories = [];
  let loading = true;
  let selectedPropertyId = '';
  let activeTab = 'expenses';

  // Expense modal
  let showExpenseModal = false;
  let editingExpense = null;
  let expenseForm = {
    propertyId: '', category: '', description: '', amount: '',
    date: format(new Date(), 'yyyy-MM-dd'), accountId: '', notes: ''
  };

  // Income modal
  let showIncomeModal = false;
  let editingIncome = null;
  let incomeForm = {
    category: '', description: '', amount: '',
    date: format(new Date(), 'yyyy-MM-dd'), accountId: '', propertyId: '', notes: ''
  };

  const colorClass = {
    red: 'badge-red', yellow: 'badge-yellow', green: 'badge-green',
    blue: 'badge-blue', purple: 'badge-purple', orange: 'badge-yellow'
  };

  function catColor(cat, cats) {
    const found = cats.find(c => c.name === cat || c.name.toLowerCase() === cat?.toLowerCase());
    return colorClass[found?.color] || 'badge-blue';
  }

  async function load() {
    loading = true;
    [expenses, incomes, properties, accounts, expenseCategories, incomeCategories] = await Promise.all([
      getExpenses(selectedPropertyId ? { propertyId: selectedPropertyId } : {}),
      getIncome(selectedPropertyId ? { propertyId: selectedPropertyId } : {}),
      getProperties(),
      getAccounts(),
      getCategories('expense'),
      getCategories('income')
    ]);
    loading = false;
  }

  onMount(load);

  $: load(), selectedPropertyId;

  // ── Expense CRUD ────────────────────────────────────────────────────────────

  function openAddExpense() {
    editingExpense = null;
    expenseForm = {
      propertyId: selectedPropertyId || (properties[0]?.id || ''),
      category: expenseCategories[0]?.name || '',
      description: '', amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      accountId: '', notes: ''
    };
    showExpenseModal = true;
  }

  function openEditExpense(e) {
    editingExpense = e;
    expenseForm = {
      propertyId: e.propertyId || '',
      category: e.category || '',
      description: e.description || '',
      amount: e.amount || '',
      date: e.date ? format(new Date(e.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      accountId: e.accountId || '',
      notes: e.notes || ''
    };
    showExpenseModal = true;
  }

  async function saveExpense() {
    const property = properties.find(p => p.id === expenseForm.propertyId);
    if (editingExpense) {
      await updateExpense(editingExpense.id, {
        ...expenseForm,
        propertyName: property?.name || '',
        amount: Number(expenseForm.amount),
        accountId: expenseForm.accountId || null
      });
    } else {
      await addExpense({
        ...expenseForm,
        propertyName: property?.name || '',
        amount: Number(expenseForm.amount),
        accountId: expenseForm.accountId || null,
        createdBy: $user?.id
      });
    }
    showExpenseModal = false;
    await load();
  }

  async function removeExpense(id) {
    if (!confirm('Delete this expense?')) return;
    await deleteExpense(id);
    await load();
  }

  // ── Income CRUD ─────────────────────────────────────────────────────────────

  function openAddIncome() {
    editingIncome = null;
    incomeForm = {
      category: incomeCategories[0]?.name || '',
      description: '', amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      accountId: '', propertyId: selectedPropertyId || '', notes: ''
    };
    showIncomeModal = true;
  }

  function openEditIncome(i) {
    editingIncome = i;
    incomeForm = {
      category: i.category || '',
      description: i.description || '',
      amount: i.amount || '',
      date: i.paidOn ? format(new Date(i.paidOn), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      accountId: i.accountId || '',
      propertyId: i.propertyId || '',
      notes: i.notes || ''
    };
    showIncomeModal = true;
  }

  async function saveIncome() {
    if (editingIncome) {
      await updateIncome(editingIncome.id, {
        ...incomeForm,
        amount: Number(incomeForm.amount),
        accountId: incomeForm.accountId || null,
        propertyId: incomeForm.propertyId || null
      });
    } else {
      await addIncome({
        ...incomeForm,
        amount: Number(incomeForm.amount),
        accountId: incomeForm.accountId || null,
        propertyId: incomeForm.propertyId || null
      });
    }
    showIncomeModal = false;
    await load();
  }

  async function removeIncome(id) {
    if (!confirm('Delete this income entry?')) return;
    await deleteIncome(id);
    await load();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function formatDate(ts) {
    if (!ts) return '—';
    try { return format(new Date(ts), 'dd MMM yyyy'); } catch { return '—'; }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }

  function propertyName(id) {
    return properties.find(p => p.id === id)?.name || '—';
  }

  $: totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  $: totalIncome = incomes.reduce((s, i) => s + (i.amount || 0), 0);

  $: expenseCategoryBreakdown = expenseCategories.map(cat => ({
    cat: cat.name, color: colorClass[cat.color] || 'badge-blue',
    total: expenses.filter(e => e.category?.toLowerCase() === cat.name.toLowerCase()).reduce((s, e) => s + (e.amount || 0), 0)
  })).filter(c => c.total > 0);

  $: incomeCategoryBreakdown = incomeCategories.map(cat => ({
    cat: cat.name, color: colorClass[cat.color] || 'badge-green',
    total: incomes.filter(i => i.category?.toLowerCase() === cat.name.toLowerCase()).reduce((s, i) => s + (i.amount || 0), 0)
  })).filter(c => c.total > 0);
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">Finance</h1>
      <p class="text-sm text-gray-500 mt-0.5">
        {#if activeTab === 'expenses'}
          {expenses.length} records · {formatCurrency(totalExpenses)} total
        {:else}
          {incomes.length} records · {formatCurrency(totalIncome)} total
        {/if}
      </p>
    </div>
    {#if activeTab === 'expenses'}
      <button class="btn-primary" on:click={openAddExpense}>+ Add Expense</button>
    {:else}
      <button class="btn-primary" on:click={openAddIncome}>+ Add Income</button>
    {/if}
  </div>

  <!-- Tabs -->
  <div class="flex gap-1 p-1 rounded-xl bg-gray-100 max-w-xs">
    <button
      class="flex-1 py-1.5 text-sm font-medium rounded-lg transition-all {activeTab === 'expenses' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}"
      on:click={() => activeTab = 'expenses'}
    >Expenses</button>
    <button
      class="flex-1 py-1.5 text-sm font-medium rounded-lg transition-all {activeTab === 'income' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}"
      on:click={() => activeTab = 'income'}
    >Income</button>
  </div>

  <!-- Filters -->
  <select class="input max-w-xs" bind:value={selectedPropertyId}>
    <option value="">All Properties</option>
    {#each properties as p}
      <option value={p.id}>{p.name}</option>
    {/each}
  </select>

  {#if activeTab === 'expenses'}
    <!-- Expense category breakdown -->
    {#if expenseCategoryBreakdown.length > 0}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {#each expenseCategoryBreakdown as { cat, color, total }}
          <div class="card py-3 text-center">
            <span class="{color} text-xs">{cat}</span>
            <p class="text-lg font-bold text-gray-900 mt-1">{formatCurrency(total)}</p>
          </div>
        {/each}
      </div>
    {/if}

    {#if loading}
      <div class="space-y-2">
        {#each Array(5) as _}
          <div class="card animate-pulse h-14"></div>
        {/each}
      </div>
    {:else if expenses.length === 0}
      <div class="card text-center py-16">
        <p class="text-4xl mb-3">🧾</p>
        <p class="text-gray-500">No expenses recorded yet.</p>
        <button class="btn-primary mt-4" on:click={openAddExpense}>Add Expense</button>
      </div>
    {:else}
      <div class="card p-0 overflow-hidden overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Property</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th class="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each expenses as expense}
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-900">{expense.description}</p>
                  {#if expense.notes}
                    <p class="text-xs text-gray-400">{expense.notes}</p>
                  {/if}
                </td>
                <td class="px-4 py-3 text-gray-500">{expense.propertyName || propertyName(expense.propertyId)}</td>
                <td class="px-4 py-3">
                  <span class="{catColor(expense.category, expenseCategories)} capitalize">{expense.category}</span>
                </td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(expense.amount)}</td>
                <td class="px-4 py-3 text-gray-500">{formatDate(expense.date)}</td>
                <td class="px-4 py-3">
                  <div class="flex gap-1 justify-end">
                    <button class="btn-secondary text-xs py-1 px-2" on:click={() => openEditExpense(expense)}>Edit</button>
                    <button class="btn-danger text-xs py-1 px-2" on:click={() => removeExpense(expense.id)}>Del</button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

  {:else}
    <!-- Income category breakdown -->
    {#if incomeCategoryBreakdown.length > 0}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {#each incomeCategoryBreakdown as { cat, color, total }}
          <div class="card py-3 text-center">
            <span class="{color} text-xs">{cat}</span>
            <p class="text-lg font-bold text-gray-900 mt-1">{formatCurrency(total)}</p>
          </div>
        {/each}
      </div>
    {/if}

    {#if loading}
      <div class="space-y-2">
        {#each Array(5) as _}
          <div class="card animate-pulse h-14"></div>
        {/each}
      </div>
    {:else if incomes.length === 0}
      <div class="card text-center py-16">
        <p class="text-4xl mb-3">💰</p>
        <p class="text-gray-500">No income entries recorded yet.</p>
        <button class="btn-primary mt-4" on:click={openAddIncome}>Add Income</button>
      </div>
    {:else}
      <div class="card p-0 overflow-hidden overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th class="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each incomes as income}
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-900">{income.description}</p>
                  {#if income.notes}
                    <p class="text-xs text-gray-400">{income.notes}</p>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  <span class="{catColor(income.category, incomeCategories)} capitalize">{income.category}</span>
                </td>
                <td class="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(income.amount)}</td>
                <td class="px-4 py-3 text-gray-500">{formatDate(income.paidOn)}</td>
                <td class="px-4 py-3">
                  <div class="flex gap-1 justify-end">
                    <button class="btn-secondary text-xs py-1 px-2" on:click={() => openEditIncome(income)}>Edit</button>
                    <button class="btn-danger text-xs py-1 px-2" on:click={() => removeIncome(income.id)}>Del</button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<!-- Add/Edit Expense Modal -->
<Modal title="{editingExpense ? 'Edit' : 'Add'} Expense" bind:open={showExpenseModal}>
  <form on:submit|preventDefault={saveExpense} class="space-y-4">
    <div>
      <label class="label">Property *</label>
      <select class="input" bind:value={expenseForm.propertyId} required>
        <option value="">Select property...</option>
        {#each properties as p}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">Category *</label>
      <select class="input" bind:value={expenseForm.category}>
        {#each expenseCategories as cat}
          <option value={cat.name}>{cat.name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">Description *</label>
      <input class="input" bind:value={expenseForm.description} placeholder="What was this expense for?" required />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Amount (₹) *</label>
        <input class="input" type="number" step="0.01" bind:value={expenseForm.amount} min="0" required />
      </div>
      <div>
        <label class="label">Date *</label>
        <input class="input" type="date" bind:value={expenseForm.date} required />
      </div>
    </div>
    <div>
      <label class="label">Account (optional)</label>
      <select class="input" bind:value={expenseForm.accountId}>
        <option value="">Not linked</option>
        {#each accounts as a}
          <option value={a.id}>{a.name} ({a.type})</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">Notes</label>
      <textarea class="input" rows="2" bind:value={expenseForm.notes} placeholder="Optional notes..."></textarea>
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">{editingExpense ? 'Update' : 'Add'} Expense</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showExpenseModal = false}>Cancel</button>
    </div>
  </form>
</Modal>

<!-- Add/Edit Income Modal -->
<Modal title="{editingIncome ? 'Edit' : 'Add'} Income" bind:open={showIncomeModal}>
  <form on:submit|preventDefault={saveIncome} class="space-y-4">
    <div>
      <label class="label">Category *</label>
      <select class="input" bind:value={incomeForm.category}>
        {#each incomeCategories as cat}
          <option value={cat.name}>{cat.name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">Description *</label>
      <input class="input" bind:value={incomeForm.description} placeholder="Describe this income..." required />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Amount (₹) *</label>
        <input class="input" type="number" step="0.01" bind:value={incomeForm.amount} min="0" required />
      </div>
      <div>
        <label class="label">Date *</label>
        <input class="input" type="date" bind:value={incomeForm.date} required />
      </div>
    </div>
    <div>
      <label class="label">Account (optional)</label>
      <select class="input" bind:value={incomeForm.accountId}>
        <option value="">Not linked</option>
        {#each accounts as a}
          <option value={a.id}>{a.name} ({a.type})</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">Property (optional)</label>
      <select class="input" bind:value={incomeForm.propertyId}>
        <option value="">Not linked</option>
        {#each properties as p}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">Notes</label>
      <textarea class="input" rows="2" bind:value={incomeForm.notes} placeholder="Optional notes..."></textarea>
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">{editingIncome ? 'Update' : 'Add'} Income</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showIncomeModal = false}>Cancel</button>
    </div>
  </form>
</Modal>
