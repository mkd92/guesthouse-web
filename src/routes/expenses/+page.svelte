<script>
  import { onMount } from 'svelte';
  import { getExpenses, addExpense, deleteExpense, getProperties } from '$lib/stores/data';
  import { user } from '$lib/stores/auth';
  import Modal from '$lib/components/Modal.svelte';
  import { format } from 'date-fns';

  let expenses = [];
  let properties = [];
  let loading = true;
  let selectedPropertyId = '';
  let showModal = false;

  let form = {
    propertyId: '', category: 'maintenance',
    description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'),
    receiptUrl: '', notes: ''
  };

  const categories = ['maintenance', 'utility', 'tax', 'insurance', 'staff', 'other'];
  const categoryColors = {
    maintenance: 'badge-yellow', utility: 'badge-blue', tax: 'badge-red',
    insurance: 'badge-green', staff: 'badge-blue', other: 'badge-yellow'
  };

  async function load() {
    loading = true;
    [expenses, properties] = await Promise.all([
      getExpenses(selectedPropertyId ? { propertyId: selectedPropertyId } : {}),
      getProperties()
    ]);
    loading = false;
  }

  onMount(load);

  $: load(), selectedPropertyId;

  function openModal() {
    form = {
      propertyId: selectedPropertyId || (properties[0]?.id || ''),
      category: 'maintenance', description: '', amount: '',
      date: format(new Date(), 'yyyy-MM-dd'), receiptUrl: '', notes: ''
    };
    showModal = true;
  }

  async function save() {
    const property = properties.find(p => p.id === form.propertyId);
    await addExpense({
      ...form,
      propertyName: property?.name || '',
      amount: Number(form.amount),
      createdBy: $user.uid
    });
    showModal = false;
    await load();
  }

  async function remove(id) {
    if (!confirm('Delete this expense?')) return;
    await deleteExpense(id);
    await load();
  }

  function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return format(d, 'dd MMM yyyy');
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }

  function propertyName(id) {
    return properties.find(p => p.id === id)?.name || '—';
  }

  $: totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  $: categoryBreakdown = categories.map(cat => ({
    cat, total: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0)
  })).filter(c => c.total > 0);
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">Expenses</h1>
      <p class="text-sm text-gray-500 mt-0.5">{expenses.length} records · {formatCurrency(totalExpenses)} total</p>
    </div>
    <button class="btn-primary" on:click={openModal}>+ Add Expense</button>
  </div>

  <!-- Filters -->
  <select class="input max-w-xs" bind:value={selectedPropertyId}>
    <option value="">All Properties</option>
    {#each properties as p}
      <option value={p.id}>{p.name}</option>
    {/each}
  </select>

  <!-- Category breakdown -->
  {#if categoryBreakdown.length > 0}
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {#each categoryBreakdown as { cat, total }}
        <div class="card py-3 text-center">
          <span class="{categoryColors[cat] || 'badge-blue'} capitalize text-xs">{cat}</span>
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
      <button class="btn-primary mt-4" on:click={openModal}>Add Expense</button>
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
                <span class="{categoryColors[expense.category] || 'badge-blue'} capitalize">{expense.category}</span>
              </td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(expense.amount)}</td>
              <td class="px-4 py-3 text-gray-500">{formatDate(expense.date)}</td>
              <td class="px-4 py-3">
                <button class="btn-danger text-xs py-1 px-2" on:click={() => remove(expense.id)}>Del</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<Modal title="Add Expense" bind:open={showModal}>
  <form on:submit|preventDefault={save} class="space-y-4">
    <div>
      <label class="label">Property *</label>
      <select class="input" bind:value={form.propertyId} required>
        <option value="">Select property...</option>
        {#each properties as p}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">Category *</label>
      <select class="input" bind:value={form.category}>
        {#each categories as cat}
          <option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">Description *</label>
      <input class="input" bind:value={form.description} placeholder="What was this expense for?" required />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Amount (₹) *</label>
        <input class="input" type="number" bind:value={form.amount} min="0" required />
      </div>
      <div>
        <label class="label">Date *</label>
        <input class="input" type="date" bind:value={form.date} required />
      </div>
    </div>
    <div>
      <label class="label">Receipt URL</label>
      <input class="input" type="url" bind:value={form.receiptUrl} placeholder="https://... (optional)" />
    </div>
    <div>
      <label class="label">Notes</label>
      <textarea class="input" rows="2" bind:value={form.notes} placeholder="Optional notes..."></textarea>
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">Add Expense</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showModal = false}>Cancel</button>
    </div>
  </form>
</Modal>
