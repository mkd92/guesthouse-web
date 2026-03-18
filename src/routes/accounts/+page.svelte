<script>
  import { onMount } from 'svelte';
  import {
    getAccounts, addAccount, updateAccount, deleteAccount,
    getTransfers, addTransfer, deleteTransfer
  } from '$lib/stores/data';
  import { supabase } from '$lib/supabase';
  import Modal from '$lib/components/Modal.svelte';
  import { format, parseISO } from 'date-fns';

  let accounts = [];
  let transfers = [];
  let loading = true;

  // Add/Edit account modal
  let showAccountModal = false;
  let editingAccount = null;
  let accountForm = { name: '', type: 'cash', openingBalance: 0, notes: '' };
  let accountError = '';

  // Transfer modal
  let showTransferModal = false;
  let transferForm = { fromAccountId: '', toAccountId: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' };

  // Ledger modal
  let showLedger = false;
  let ledgerAccount = null;
  let ledgerEntries = [];
  let ledgerLoading = false;

  // Balances map: accountId -> balance
  let balances = {};

  const typeLabel = { cash: '💵 Cash', bank: '🏦 Bank', credit_card: '💳 Credit' };

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  }

  function formatDate(val) {
    if (!val) return '—';
    try { return format(typeof val === 'string' ? parseISO(val) : new Date(val), 'dd MMM yyyy'); } catch { return '—'; }
  }

  async function computeBalances(accs, txns, tfrs, exps) {
    const map = {};
    for (const a of accs) {
      const opening = a.openingBalance || 0;
      const paidInflow = txns.filter(t => t.accountId === a.id && t.status === 'paid')
        .reduce((s, t) => s + (t.amount || 0), 0);
      const tfrIn = tfrs.filter(t => t.toAccountId === a.id)
        .reduce((s, t) => s + (t.amount || 0), 0);
      const tfrOut = tfrs.filter(t => t.fromAccountId === a.id)
        .reduce((s, t) => s + (t.amount || 0), 0);
      const expOut = exps.filter(e => e.accountId === a.id)
        .reduce((s, e) => s + (e.amount || 0), 0);
      map[a.id] = opening + paidInflow + tfrIn - tfrOut - expOut;
    }
    return map;
  }

  async function load() {
    loading = true;
    const [accs, tfrs] = await Promise.all([getAccounts(), getTransfers()]);
    accounts = accs;
    transfers = tfrs;

    // Load all transactions and expenses to compute balances client-side
    const [txnRes, expRes] = await Promise.all([
      supabase.from('transactions').select('account_id, amount, status').eq('status', 'paid'),
      supabase.from('expenses').select('account_id, amount')
    ]);

    const txns = (txnRes.data || []).map(r => ({ accountId: r.account_id, amount: r.amount, status: r.status }));
    const exps = (expRes.data || []).map(r => ({ accountId: r.account_id, amount: r.amount }));

    balances = await computeBalances(accounts, txns, transfers, exps);
    loading = false;
  }

  onMount(load);

  // ── Account CRUD ────────────────────────────────────────────────────────────

  function openAddAccount() {
    editingAccount = null;
    accountForm = { name: '', type: 'cash', openingBalance: 0, notes: '' };
    showAccountModal = true;
  }

  function openEditAccount(a) {
    editingAccount = a;
    accountForm = { name: a.name, type: a.type, openingBalance: a.openingBalance || 0, notes: a.notes || '' };
    showAccountModal = true;
  }

  async function saveAccount() {
    accountError = '';
    try {
      const data = { ...accountForm, openingBalance: Number(accountForm.openingBalance) };
      if (editingAccount) {
        await updateAccount(editingAccount.id, data);
      } else {
        await addAccount(data);
      }
      showAccountModal = false;
      await load();
    } catch (e) {
      accountError = e.message || JSON.stringify(e);
    }
  }

  async function removeAccount(id) {
    if (!confirm('Delete this account? This cannot be undone.')) return;
    await deleteAccount(id);
    await load();
  }

  // ── Transfer ────────────────────────────────────────────────────────────────

  function openTransfer() {
    transferForm = {
      fromAccountId: accounts[0]?.id || '',
      toAccountId: accounts[1]?.id || '',
      amount: '', date: format(new Date(), 'yyyy-MM-dd'), notes: ''
    };
    showTransferModal = true;
  }

  async function saveTransfer() {
    await addTransfer({ ...transferForm, amount: Number(transferForm.amount) });
    showTransferModal = false;
    await load();
  }

  async function removeTransfer(id) {
    if (!confirm('Delete this transfer?')) return;
    await deleteTransfer(id);
    await load();
  }

  // ── Ledger ──────────────────────────────────────────────────────────────────

  async function openLedger(account) {
    ledgerAccount = account;
    showLedger = true;
    ledgerLoading = true;

    const [txnRes, tfrRes, expRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('account_id', account.id).eq('status', 'paid'),
      supabase.from('account_transfers').select('*').or(`from_account_id.eq.${account.id},to_account_id.eq.${account.id}`),
      supabase.from('expenses').select('*').eq('account_id', account.id)
    ]);

    const entries = [];

    // Opening balance entry
    entries.push({
      date: account.createdAt || new Date().toISOString(),
      description: 'Opening balance',
      in: account.openingBalance > 0 ? account.openingBalance : null,
      out: account.openingBalance < 0 ? Math.abs(account.openingBalance) : null,
      _sort: account.createdAt || '1970-01-01'
    });

    // Paid transactions
    for (const t of txnRes.data || []) {
      entries.push({
        date: t.paid_on || t.created_at,
        description: `Rent — ${t.customer_name || ''} (${t.period || ''})`.trim(),
        in: t.amount,
        out: null,
        _sort: t.paid_on || t.created_at
      });
    }

    // Transfers
    for (const t of tfrRes.data || []) {
      const isIn = t.to_account_id === account.id;
      const otherAccountId = isIn ? t.from_account_id : t.to_account_id;
      const otherAccount = accounts.find(a => a.id === otherAccountId);
      const otherName = otherAccount?.name || 'Unknown';
      entries.push({
        date: t.date || t.created_at,
        description: isIn ? `Transfer from ${otherName}` : `Transfer → ${otherName}`,
        in: isIn ? t.amount : null,
        out: isIn ? null : t.amount,
        _sort: t.date || t.created_at
      });
    }

    // Expenses
    for (const e of expRes.data || []) {
      entries.push({
        date: e.date || e.created_at,
        description: `Expense — ${e.description}`,
        in: null,
        out: e.amount,
        _sort: e.date || e.created_at
      });
    }

    // Sort by date ascending
    entries.sort((a, b) => (a._sort < b._sort ? -1 : 1));

    // Compute running balance
    let running = 0;
    ledgerEntries = entries.map(e => {
      running += (e.in || 0) - (e.out || 0);
      return { ...e, balance: running };
    });

    ledgerLoading = false;
  }
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">Accounts</h1>
      <p class="text-sm text-gray-500 mt-0.5">Track where your money lives</p>
    </div>
    <div class="flex gap-2">
      <button class="btn-secondary" on:click={openTransfer}>↕ Transfer</button>
      <button class="btn-primary" on:click={openAddAccount}>+ Add Account</button>
    </div>
  </div>

  {#if loading}
    <div class="space-y-2">
      {#each Array(3) as _}
        <div class="card animate-pulse h-14"></div>
      {/each}
    </div>
  {:else if accounts.length === 0}
    <div class="card text-center py-16">
      <p class="text-4xl mb-3">🏦</p>
      <p class="text-gray-500 mb-4">No accounts yet. Add Cash, Bank, or Credit Card accounts.</p>
      <button class="btn-primary" on:click={openAddAccount}>+ Add Account</button>
    </div>
  {:else}
    <!-- Accounts table -->
    <div class="card p-0 overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Name</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Type</th>
            <th class="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each accounts as account}
            {@const balance = balances[account.id] ?? 0}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{account.name}</p>
                {#if account.notes}
                  <p class="text-xs text-gray-400">{account.notes}</p>
                {/if}
              </td>
              <td class="px-4 py-3 text-gray-600">{typeLabel[account.type] || account.type}</td>
              <td class="px-4 py-3 text-right font-semibold {balance < 0 ? 'text-red-600' : 'text-green-700'}">
                {formatCurrency(balance)}
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1 justify-end">
                  <button class="btn-secondary text-xs py-1 px-2" on:click={() => openLedger(account)}>Ledger</button>
                  <button class="btn-secondary text-xs py-1 px-2" on:click={() => openEditAccount(account)}>Edit</button>
                  <button class="btn-danger text-xs py-1 px-2" on:click={() => removeAccount(account.id)}>Del</button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Recent transfers -->
    {#if transfers.length > 0}
      <div>
        <h2 class="text-sm font-semibold text-gray-700 mb-2">Recent Transfers</h2>
        <div class="card p-0 overflow-hidden overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">From</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">To</th>
                <th class="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              {#each transfers.slice(0, 10) as t}
                {@const fromAcc = accounts.find(a => a.id === t.fromAccountId)}
                {@const toAcc = accounts.find(a => a.id === t.toAccountId)}
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-500">{formatDate(t.date)}</td>
                  <td class="px-4 py-3 text-gray-700">{fromAcc?.name || '—'}</td>
                  <td class="px-4 py-3 text-gray-700">{toAcc?.name || '—'}</td>
                  <td class="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(t.amount)}</td>
                  <td class="px-4 py-3">
                    <button class="btn-danger text-xs py-1 px-2" on:click={() => removeTransfer(t.id)}>Del</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Add/Edit Account Modal -->
<Modal title={editingAccount ? 'Edit Account' : 'Add Account'} bind:open={showAccountModal}>
  <form on:submit|preventDefault={saveAccount} class="space-y-4">
    <div>
      <label class="label">Name *</label>
      <input class="input" bind:value={accountForm.name} placeholder="e.g. HDFC Savings, Petty Cash" required />
    </div>
    <div>
      <label class="label">Type *</label>
      <select class="input" bind:value={accountForm.type}>
        <option value="cash">💵 Cash</option>
        <option value="bank">🏦 Bank</option>
        <option value="credit_card">💳 Credit Card</option>
      </select>
    </div>
    <div>
      <label class="label">Opening Balance (₹)</label>
      <input class="input" type="number" bind:value={accountForm.openingBalance} />
    </div>
    <div>
      <label class="label">Notes</label>
      <input class="input" bind:value={accountForm.notes} placeholder="Optional" />
    </div>
    {#if accountError}
      <p class="text-sm text-red-600 bg-red-50 rounded p-2">{accountError}</p>
    {/if}
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">{editingAccount ? 'Update' : 'Add'}</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showAccountModal = false}>Cancel</button>
    </div>
  </form>
</Modal>

<!-- Transfer Modal -->
<Modal title="Transfer Between Accounts" bind:open={showTransferModal}>
  <form on:submit|preventDefault={saveTransfer} class="space-y-4">
    <div>
      <label class="label">From Account *</label>
      <select class="input" bind:value={transferForm.fromAccountId} required>
        <option value="">Select account...</option>
        {#each accounts as a}
          <option value={a.id}>{a.name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">To Account *</label>
      <select class="input" bind:value={transferForm.toAccountId} required>
        <option value="">Select account...</option>
        {#each accounts.filter(a => a.id !== transferForm.fromAccountId) as a}
          <option value={a.id}>{a.name}</option>
        {/each}
      </select>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Amount (₹) *</label>
        <input class="input" type="number" bind:value={transferForm.amount} min="1" required />
      </div>
      <div>
        <label class="label">Date</label>
        <input class="input" type="date" bind:value={transferForm.date} />
      </div>
    </div>
    <div>
      <label class="label">Notes</label>
      <input class="input" bind:value={transferForm.notes} placeholder="Optional" />
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">Transfer</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showTransferModal = false}>Cancel</button>
    </div>
  </form>
</Modal>

<!-- Ledger Modal -->
<Modal title="Account Ledger — {ledgerAccount?.name || ''}" bind:open={showLedger}>
  {#if ledgerLoading}
    <div class="space-y-2 py-4">
      {#each Array(5) as _}
        <div class="animate-pulse h-8 rounded" style="background: var(--bg-hover);"></div>
      {/each}
    </div>
  {:else if ledgerEntries.length === 0}
    <p class="text-sm text-center py-8" style="color: var(--text-3);">No entries yet.</p>
  {:else}
    <div class="overflow-x-auto -mx-1">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b" style="border-color: var(--border);">
            <th class="text-left py-2 px-2 font-medium text-xs" style="color: var(--text-3);">Date</th>
            <th class="text-left py-2 px-2 font-medium text-xs" style="color: var(--text-3);">Description</th>
            <th class="text-right py-2 px-2 font-medium text-xs" style="color: var(--text-3);">In</th>
            <th class="text-right py-2 px-2 font-medium text-xs" style="color: var(--text-3);">Out</th>
            <th class="text-right py-2 px-2 font-medium text-xs" style="color: var(--text-3);">Balance</th>
          </tr>
        </thead>
        <tbody>
          {#each ledgerEntries as entry}
            <tr class="border-b" style="border-color: var(--border);">
              <td class="py-2 px-2 text-xs whitespace-nowrap" style="color: var(--text-3);">{formatDate(entry.date)}</td>
              <td class="py-2 px-2 text-xs" style="color: var(--text-2);">{entry.description}</td>
              <td class="py-2 px-2 text-xs text-right text-green-600">{entry.in ? formatCurrency(entry.in) : ''}</td>
              <td class="py-2 px-2 text-xs text-right text-red-500">{entry.out ? formatCurrency(entry.out) : ''}</td>
              <td class="py-2 px-2 text-xs text-right font-semibold {entry.balance < 0 ? 'text-red-600' : ''}" style="color: {entry.balance >= 0 ? 'var(--text-1)' : ''};">{formatCurrency(entry.balance)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
  <div class="pt-3 flex justify-end">
    <button class="btn-secondary" on:click={() => showLedger = false}>Close</button>
  </div>
</Modal>
