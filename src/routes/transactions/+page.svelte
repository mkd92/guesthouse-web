<script>
  import { onMount } from 'svelte';
  import { getTransactions, addTransaction, updateTransaction, deleteTransaction, getCustomers, getBookings, getProperties, getAccounts } from '$lib/stores/data';
  import Modal from '$lib/components/Modal.svelte';
  import WhatsAppButton from '$lib/components/WhatsAppButton.svelte';
  import { rentReminderMessage } from '$lib/utils/whatsapp';
  import { format } from 'date-fns';

  let transactions = [];
  let customers = [];
  let activeBookings = [];
  let properties = [];
  let accounts = [];
  let loading = true;
  let filter = 'all'; // all, pending, paid
  let selectedType = '';
  let selectedPropertyId = '';
  let showModal = false;
  let editingTxn = null;
  let showMarkPaidModal = false;
  let markPaidTxn = null;
  let markPaidForm = { accountId: '', paidOn: format(new Date(), 'yyyy-MM-dd') };
  let markPaidSubmitting = false;

  let form = {
    customerId: '',
    amount: '',
    type: 'rent',
    period: format(new Date(), 'MMMM yyyy'),
    status: 'pending',
    accountId: '',
    paidOn: '',
    notes: ''
  };

  let splitMode = false;
  let splitForm = {
    payerName: '',
    period: format(new Date(), 'MMMM yyyy'),
    accountId: '',
    paidOn: format(new Date(), 'yyyy-MM-dd'),
  };
  let splitRows = [{ customerId: '', amount: '', pendingTxns: [], linkedPendingId: '' }];

  $: splitTotal = splitRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // Customer combobox
  let customerSearch = '';
  let customerSuggestionsVisible = false;
  let customerHighlightIdx = -1;
  $: customerSuggestions = customerSearch.trim()
    ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers;

  function selectCustomer(c) {
    customerSearch = c.name;
    form.customerId = c.id;
    customerSuggestionsVisible = false;
    customerHighlightIdx = -1;
    onCustomerChange(c.id);
  }

  function onCustomerKeydown(e) {
    if (!customerSuggestionsVisible) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { customerSuggestionsVisible = true; customerHighlightIdx = 0; e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') { customerHighlightIdx = Math.min(customerHighlightIdx + 1, customerSuggestions.length - 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { customerHighlightIdx = Math.max(customerHighlightIdx - 1, 0); e.preventDefault(); }
    else if (e.key === 'Enter') {
      if (customerHighlightIdx >= 0 && customerSuggestions[customerHighlightIdx]) {
        selectCustomer(customerSuggestions[customerHighlightIdx]);
        e.preventDefault();
      }
    } else if (e.key === 'Escape') { customerSuggestionsVisible = false; }
  }

  function onCustomerInput() {
    form.customerId = '';
    customerSuggestionsVisible = true;
    customerHighlightIdx = -1;
    customerPendingTxns = [];
    linkedPendingIds = new Set();
  }

  // Single mode — pending transactions for the selected customer
  let customerPendingTxns = [];
  let linkedPendingIds = new Set();

  // Auto-fill amount and flip to paid when pending(s) are checked
  $: if (linkedPendingIds.size > 0) {
    const total = customerPendingTxns
      .filter(t => linkedPendingIds.has(t.id))
      .reduce((s, t) => s + t.amount, 0);
    form.amount = total;
    form.status = 'paid';
    if (!form.paidOn) form.paidOn = format(new Date(), 'yyyy-MM-dd');
  }

  async function onCustomerChange(customerId) {
    linkedPendingIds = new Set();
    customerPendingTxns = [];
    if (!customerId) return;
    const all = await getTransactions({ customerId, status: 'pending' });
    customerPendingTxns = all.slice().reverse(); // oldest first
  }

  function toggleLinkedPending(id) {
    const next = new Set(linkedPendingIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    linkedPendingIds = next;
  }

  function autoLinkOldest() {
    if (!customerPendingTxns.length) return;
    linkedPendingIds = new Set([customerPendingTxns[0].id]);
  }

  async function onSplitCustomerChange(i, customerId) {
    let pendingTxns = [];
    if (customerId) {
      const all = await getTransactions({ customerId, status: 'pending' });
      pendingTxns = all.slice().reverse(); // oldest first
    }
    splitRows[i] = { ...splitRows[i], linkedPendingId: '', pendingTxns };
    splitRows = [...splitRows];
  }

  function autoLinkSplitRow(i) {
    const row = splitRows[i];
    if (!row.pendingTxns?.length) return;
    const oldest = row.pendingTxns[0];
    splitRows[i] = { ...row, linkedPendingId: oldest.id, amount: oldest.amount };
    splitRows = [...splitRows];
  }

  async function load() {
    loading = true;
    const filters = {};
    if (filter !== 'all') filters.status = filter;
    if (selectedPropertyId) filters.propertyId = selectedPropertyId;
    [transactions, customers, activeBookings, properties, accounts] = await Promise.all([
      getTransactions(filters),
      getCustomers(),
      getBookings('active'),
      getProperties(),
      getAccounts()
    ]);
    loading = false;
  }

  onMount(load);

  $: load(), filter, selectedPropertyId;

  function openModal(txn = null) {
    editingTxn = txn;
    customerSearch = txn ? (txn.customerName || '') : '';
    customerSuggestionsVisible = false;
    customerHighlightIdx = -1;
    form = txn ? {
      customerId: txn.customerId,
      amount: txn.amount,
      type: txn.type,
      period: txn.period,
      status: txn.status,
      accountId: txn.accountId || '',
      paidOn: txn.paidOn?.toDate ? format(txn.paidOn.toDate(), 'yyyy-MM-dd') : (txn.paidOn || ''),
      notes: txn.notes || ''
    } : {
      customerId: '',
      amount: '',
      type: 'rent',
      period: format(new Date(), 'MMMM yyyy'),
      status: 'pending',
      accountId: '',
      paidOn: '',
      notes: ''
    };
    splitMode = false;
    splitForm = {
      payerName: '',
      period: format(new Date(), 'MMMM yyyy'),
      accountId: '',
      paidOn: format(new Date(), 'yyyy-MM-dd'),
    };
    splitRows = [{ customerId: '', amount: '', pendingTxns: [], linkedPendingId: '' }];
    customerPendingTxns = [];
    linkedPendingIds = new Set();
    showModal = true;
  }

  async function saveSplit() {
    const rows = splitRows.filter(r => r.customerId && r.amount);
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      for (const row of rows) {
        if (row.linkedPendingId) {
          await updateTransaction(row.linkedPendingId, {
            status: 'paid',
            amount: Number(row.amount),
            paidOn: splitForm.paidOn || today,
            accountId: splitForm.accountId || null,
            notes: splitForm.payerName ? `Paid by ${splitForm.payerName}` : ''
          });
        } else {
          const customer = customers.find(c => c.id === row.customerId);
          await addTransaction({
            customerId: row.customerId,
            customerName: customer?.name || '',
            amount: Number(row.amount),
            type: 'rent',
            period: splitForm.period,
            status: 'paid',
            accountId: splitForm.accountId || null,
            paidOn: splitForm.paidOn || today,
            dueDate: today,
            bookingId: null,
            notes: splitForm.payerName ? `Paid by ${splitForm.payerName}` : '',
          });
        }
      }
      showModal = false;
      splitMode = false;
      await load();
    } catch (err) {
      console.error('saveSplit error:', err);
      alert(`Failed to save: ${err?.message || JSON.stringify(err)}`);
    }
  }

  async function save() {
    if (!form.customerId) { alert('Please select a customer from the list.'); return; }
    if (linkedPendingIds.size > 0) {
      for (const id of linkedPendingIds) {
        await updateTransaction(id, {
          status: 'paid',
          paidOn: form.paidOn ? new Date(form.paidOn) : new Date(),
          accountId: form.accountId || null,
          notes: form.notes || ''
        });
      }
    } else {
      const customer = customers.find(c => c.id === form.customerId);
      const data = {
        ...form,
        bookingId: null,
        customerName: customer?.name || '',
        amount: Number(form.amount),
        dueDate: new Date(),
        paidOn: form.paidOn ? new Date(form.paidOn) : null,
        accountId: form.status === 'paid' ? (form.accountId || null) : null
      };
      if (editingTxn) await updateTransaction(editingTxn.id, data);
      else await addTransaction(data);
    }
    showModal = false;
    await load();
  }

  function openMarkPaid(txn) {
    markPaidTxn = txn;
    markPaidForm = { accountId: accounts[0]?.id || '', paidOn: format(new Date(), 'yyyy-MM-dd'), amount: txn.amount };
    showMarkPaidModal = true;
  }

  async function confirmMarkPaid() {
    if (markPaidSubmitting) return;
    markPaidSubmitting = true;
    try {
      const paid = Number(markPaidForm.amount);
      const full = Number(markPaidTxn.amount);
      await updateTransaction(markPaidTxn.id, {
        status: 'paid',
        amount: paid,
        paidOn: markPaidForm.paidOn ? new Date(markPaidForm.paidOn) : new Date(),
        accountId: markPaidForm.accountId || null
      });
      if (paid < full) {
        await addTransaction({
          customerId: markPaidTxn.customerId,
          customerName: markPaidTxn.customerName,
          amount: full - paid,
          type: markPaidTxn.type,
          period: markPaidTxn.period,
          status: 'pending',
          dueDate: new Date(),
          bookingId: null,
          propertyId: markPaidTxn.propertyId || null,
          notes: `Balance from partial payment (original: ₹${full})`
        });
        filter = 'all'; // show both paid + pending balance
      }
      showMarkPaidModal = false;
      markPaidTxn = null;
      await load();
    } finally {
      markPaidSubmitting = false;
    }
  }

  async function removeTxn(id) {
    if (!confirm('Delete this transaction?')) return;
    await deleteTransaction(id);
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
    return properties.find(p => p.id === id)?.name || null;
  }

  function customerPhone(customerId) {
    return customers.find(c => c.id === customerId)?.phone || '';
  }

  function getRentReminderMsg(txn) {
    const cust = customers.find(c => c.id === txn.customerId);
    if (!cust) return '';
    return rentReminderMessage({
      customerName: cust.name,
      amount: txn.amount,
      period: txn.period,
      propertyName: txn.propertyName || propertyName(txn.propertyId) || 'the property'
    });
  }

  $: filtered = selectedType ? transactions.filter(t => t.type === selectedType) : transactions;
  $: totalPending = filtered.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0);
  $: totalPaid = filtered.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0);
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">Transactions</h1>
      <p class="text-sm text-gray-500 mt-0.5">Track all rent payments and dues</p>
    </div>
    <button class="btn-primary" on:click={() => openModal()}>+ Add Transaction</button>
  </div>

  <!-- Summary -->
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
    <div class="card text-center">
      <p class="text-sm text-gray-500">Pending</p>
      <p class="text-2xl font-bold text-red-600">{formatCurrency(totalPending)}</p>
    </div>
    <div class="card text-center">
      <p class="text-sm text-gray-500">Collected (shown)</p>
      <p class="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
    </div>
    <div class="card text-center sm:block hidden">
      <p class="text-sm text-gray-500">Total Records</p>
      <p class="text-2xl font-bold text-gray-900">{filtered.length}</p>
    </div>
  </div>

  <!-- Filters -->
  <div class="flex gap-3 flex-wrap items-center">
    <div class="flex gap-2 border-b pb-1 flex-1 min-w-0">
      {#each ['all', 'pending', 'paid'] as f}
        <button
          class="px-4 py-1.5 text-sm font-medium rounded-t-lg transition-colors
            {filter === f ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
          on:click={() => filter = f}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      {/each}
    </div>
    <select class="input w-auto" bind:value={selectedType}>
      <option value="">All Types</option>
      <option value="rent">Rent</option>
      <option value="deposit">Deposit</option>
      <option value="advance">Advance</option>
      <option value="refund">Refund</option>
      <option value="other">Other</option>
    </select>
    <select class="input w-auto" bind:value={selectedPropertyId}>
      <option value="">All Properties</option>
      {#each properties as p}
        <option value={p.id}>{p.name}</option>
      {/each}
    </select>
  </div>

  {#if loading}
    <div class="space-y-2">
      {#each Array(5) as _}
        <div class="card animate-pulse h-14"></div>
      {/each}
    </div>
  {:else if filtered.length === 0}
    <div class="card text-center py-16">
      <p class="text-4xl mb-3">💰</p>
      <p class="text-gray-500">No transactions found.</p>
    </div>
  {:else}
    <div class="card p-0 overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Period</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Type</th>
            <th class="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each filtered as txn}
            {@const phone = customerPhone(txn.customerId)}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{txn.customerName || '—'}</p>
                {#if txn.bedNumber}
                  <p class="text-xs text-gray-400">Bed {txn.bedNumber}</p>
                {:else if txn.unitName}
                  <p class="text-xs text-gray-400">{txn.unitName}</p>
                {/if}
                {#if txn.propertyId}
                  <p class="text-xs text-gray-400">{txn.propertyName || propertyName(txn.propertyId)}</p>
                {/if}
              </td>
              <td class="px-4 py-3 text-gray-600">{txn.period || '—'}</td>
              <td class="px-4 py-3">
                <span class="badge-blue capitalize">{txn.type}</span>
              </td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(txn.amount)}</td>
              <td class="px-4 py-3 text-gray-500">{formatDate(txn.dueDate)}</td>
              <td class="px-4 py-3">
                {#if txn.status === 'paid'}
                  <span class="badge-green">Paid</span>
                  <p class="text-xs text-gray-400">{formatDate(txn.paidOn)}</p>
                {:else}
                  <span class="badge-red">Pending</span>
                {/if}
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1 justify-end items-center">
                  {#if txn.status === 'pending'}
                    <button class="btn-success text-xs py-1 px-2" on:click={() => openMarkPaid(txn)}>Mark Paid</button>
                    {#if phone}
                      <WhatsAppButton {phone} message={getRentReminderMsg(txn)} label="Remind" />
                    {/if}
                  {/if}
                  <button class="btn-secondary text-xs py-1 px-2" on:click={() => openModal(txn)}>Edit</button>
                  <button class="btn-danger text-xs py-1 px-2" on:click={() => removeTxn(txn.id)}>Del</button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- Mark Paid Modal -->
<Modal title="Mark as Paid" bind:open={showMarkPaidModal}>
  <form on:submit|preventDefault={confirmMarkPaid} class="space-y-4">
    {#if markPaidTxn}
      <div class="p-3 rounded-lg" style="background: var(--bg-hover);">
        <p class="font-medium text-sm" style="color: var(--text-1);">{markPaidTxn.customerName}</p>
        <p class="text-xs mt-0.5" style="color: var(--text-3);">{markPaidTxn.period} · Due: {formatCurrency(markPaidTxn.amount)}</p>
      </div>
    {/if}
    <div>
      <label class="label">Amount Collected (₹) *</label>
      <input class="input" type="number" bind:value={markPaidForm.amount} min="1" required />
      {#if markPaidTxn && Number(markPaidForm.amount) > 0 && Number(markPaidForm.amount) < markPaidTxn.amount}
        <p class="text-xs text-amber-600 mt-1">{formatCurrency(markPaidTxn.amount - Number(markPaidForm.amount))} will remain as a new pending transaction</p>
      {/if}
    </div>
    <div>
      <label class="label">Collected into Account *</label>
      <select class="input" bind:value={markPaidForm.accountId} required>
        <option value="">Select account...</option>
        {#each accounts as a}
          <option value={a.id}>{a.name} ({a.type})</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">Paid On</label>
      <input class="input" type="date" bind:value={markPaidForm.paidOn} />
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1" disabled={markPaidSubmitting}>
        {markPaidSubmitting ? 'Saving…' : 'Confirm Paid'}
      </button>
      <button type="button" class="btn-secondary flex-1" disabled={markPaidSubmitting} on:click={() => showMarkPaidModal = false}>Cancel</button>
    </div>
  </form>
</Modal>

<!-- Transaction Modal -->
<Modal title={editingTxn ? 'Edit Transaction' : 'Add Transaction'} bind:open={showModal}>
  {#if !editingTxn}
    <div class="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4">
      <button
        type="button"
        class="flex-1 py-1.5 text-sm font-medium rounded-md transition-colors
          {!splitMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
        on:click={() => splitMode = false}
      >Single</button>
      <button
        type="button"
        class="flex-1 py-1.5 text-sm font-medium rounded-md transition-colors
          {splitMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
        on:click={() => splitMode = true}
      >Split</button>
    </div>
  {/if}

  {#if splitMode}
    <form on:submit|preventDefault={saveSplit} class="space-y-4">
      <div>
        <label class="label">Payer Name</label>
        <input class="input" bind:value={splitForm.payerName} placeholder="e.g. Mrs Jayalakshmi" />
      </div>
      <div>
        <label class="label">Period</label>
        <input class="input" bind:value={splitForm.period} placeholder="e.g., March 2026" />
      </div>
      <div>
        <label class="label">Account</label>
        <select class="input" bind:value={splitForm.accountId}>
          <option value="">Select account...</option>
          {#each accounts as a}
            <option value={a.id}>{a.name} ({a.type})</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="label">Paid On</label>
        <input class="input" type="date" bind:value={splitForm.paidOn} />
      </div>

      <div class="space-y-2">
        <label class="label">Customers</label>
        {#each splitRows as row, i}
          <div class="space-y-1">
            <div class="flex gap-2 items-center">
              <select class="input flex-1" bind:value={row.customerId} on:change={() => onSplitCustomerChange(i, row.customerId)} required>
                <option value="">Select customer...</option>
                {#each customers as c}
                  <option value={c.id}>{c.name}</option>
                {/each}
              </select>
              <input class="input w-28" type="number" bind:value={row.amount} placeholder="Amount" min="1" required />
              {#if row.pendingTxns?.length > 0}
                <button type="button" class="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap" on:click={() => autoLinkSplitRow(i)}>Auto</button>
              {/if}
              {#if splitRows.length > 1}
                <button type="button" class="text-gray-400 hover:text-red-500 text-lg leading-none" on:click={() => splitRows = splitRows.filter((_, j) => j !== i)}>×</button>
              {/if}
            </div>
            {#if row.pendingTxns?.length > 0}
              <p class="text-xs font-medium pl-1" style="color: var(--color-orange, #f97316)">
                {formatCurrency(row.pendingTxns.reduce((s, t) => s + t.amount, 0))} pending
                {#if row.linkedPendingId}· <span class="text-green-500 font-semibold">linked</span>{/if}
              </p>
            {/if}
          </div>
        {/each}
        <button type="button" class="text-sm text-blue-600 hover:text-blue-800 font-medium" on:click={() => splitRows = [...splitRows, { customerId: '', amount: '', pendingTxns: [], linkedPendingId: '' }]}>+ Add Customer</button>
      </div>

      {#if splitTotal > 0}
        <div class="text-right text-sm font-semibold text-gray-700">
          Total: {formatCurrency(splitTotal)}
        </div>
      {/if}

      <div class="flex gap-3 pt-2">
        <button type="submit" class="btn-primary flex-1">Save {splitRows.filter(r => r.customerId && r.amount).length || ''} Transactions</button>
        <button type="button" class="btn-secondary flex-1" on:click={() => showModal = false}>Cancel</button>
      </div>
    </form>
  {:else}
    <form on:submit|preventDefault={save} class="space-y-4">
      <div>
        <label class="label">Customer *</label>
        <div class="relative">
          <input
            class="input"
            type="text"
            placeholder="Search customer..."
            bind:value={customerSearch}
            on:input={onCustomerInput}
            on:focus={() => { customerSuggestionsVisible = true; }}
            on:blur={() => setTimeout(() => { customerSuggestionsVisible = false; }, 150)}
            on:keydown={onCustomerKeydown}
            autocomplete="off"
          />
          <input type="hidden" bind:value={form.customerId} required />
          {#if customerSuggestionsVisible && customerSuggestions.length > 0}
            <ul class="absolute z-50 w-full mt-1 rounded-lg border shadow-lg max-h-52 overflow-y-auto" style="background: var(--surface-2); border-color: var(--border-1);">
              {#each customerSuggestions as c, i}
                <li
                  class="px-3 py-2 cursor-pointer text-sm"
                  class:bg-amber-500={i === customerHighlightIdx}
                  class:text-white={i === customerHighlightIdx}
                  style={i !== customerHighlightIdx ? 'color: var(--text-1);' : ''}
                  on:mousedown={() => selectCustomer(c)}
                  on:mouseover={() => customerHighlightIdx = i}
                >
                  {c.name}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
        {#if customerPendingTxns.length > 0}
          <div class="mt-2 rounded-lg border border-orange-400 bg-orange-500 p-3 space-y-2">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold text-white">
                {formatCurrency(customerPendingTxns.reduce((s, t) => s + t.amount, 0))} pending · {customerPendingTxns.length} transaction{customerPendingTxns.length > 1 ? 's' : ''}
              </p>
              <button type="button" class="text-xs text-white underline font-medium hover:opacity-80" on:click={autoLinkOldest}>
                Auto-link oldest
              </button>
            </div>
            {#each customerPendingTxns as pt}
              <label class="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                <input type="checkbox" class="rounded" checked={linkedPendingIds.has(pt.id)} on:change={() => toggleLinkedPending(pt.id)} />
                <span>{pt.period || '—'} — {formatCurrency(pt.amount)}</span>
              </label>
            {/each}
          </div>
        {/if}
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">Type</label>
          <select class="input" bind:value={form.type}>
            <option value="rent">Rent</option>
            <option value="deposit">Deposit</option>
            <option value="advance">Advance</option>
            <option value="refund">Refund</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label class="label">Amount (₹) *</label>
          <input class="input" type="number" bind:value={form.amount} min="0" required />
        </div>
      </div>
      <div>
        <label class="label">Period</label>
        <input class="input" bind:value={form.period} placeholder="e.g., March 2026" />
      </div>
      <div>
        <label class="label">Status</label>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors
              {form.status === 'pending' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}"
            on:click={() => { form.status = 'pending'; form.accountId = ''; form.paidOn = ''; }}
          >Pending</button>
          <button
            type="button"
            class="flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors
              {form.status === 'paid' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}"
            on:click={() => { form.status = 'paid'; if (!form.paidOn) form.paidOn = format(new Date(), 'yyyy-MM-dd'); }}
          >Paid</button>
        </div>
      </div>
      {#if form.status === 'paid'}
        <div>
          <label class="label">Account</label>
          <select class="input" bind:value={form.accountId}>
            <option value="">Select account...</option>
            {#each accounts as a}
              <option value={a.id}>{a.name} ({a.type})</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="label">Paid On</label>
          <input class="input" type="date" bind:value={form.paidOn} />
        </div>
      {/if}
      <div>
        <label class="label">Notes</label>
        <input class="input" bind:value={form.notes} placeholder="Optional notes..." />
      </div>
      <div class="flex gap-3 pt-2">
        <button type="submit" class="btn-primary flex-1">{editingTxn ? 'Update' : 'Add'}</button>
        <button type="button" class="btn-secondary flex-1" on:click={() => showModal = false}>Cancel</button>
      </div>
    </form>
  {/if}
</Modal>
