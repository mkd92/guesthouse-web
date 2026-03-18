<script>
  import { onMount } from 'svelte';
  import {
    getLeases, addLease, updateLease,
    getProperties, getCustomers, getUnits, getAvailableUnits,
    addTransaction, updateUnit
  } from '$lib/stores/data';
  import { user } from '$lib/stores/auth';
  import Modal from '$lib/components/Modal.svelte';
  import { format } from 'date-fns';

  let leases = [];
  let properties = [];
  let customers = [];
  let availableUnits = [];
  let loading = true;
  let activeTab = 'active'; // active, expired, terminated
  let showModal = false;
  let showTerminateModal = false;
  let showEditLeaseModal = false;
  let editingLease = null;
  let terminatingLease = null;
  let terminateNotes = '';
  let editLeaseForm = { rentPerMonth: '', depositAmount: '' };

  let form = {
    propertyId: '', unitId: '', customerId: '',
    rentPerMonth: '', leaseStart: format(new Date(), 'yyyy-MM-dd'),
    leaseEnd: '', joiningFee: 0, depositAmount: 0, depositPaid: false,
    documentUrl: ''
  };

  async function load() {
    loading = true;
    [leases, properties, customers] = await Promise.all([
      getLeases({ status: activeTab }),
      getProperties(),
      getCustomers()
    ]);
    properties = properties.filter(p => p.type !== 'pg');
    loading = false;
  }

  onMount(load);

  $: load(), activeTab;

  function openModal() {
    editingLease = null;
    form = {
      propertyId: properties[0]?.id || '', unitId: '', customerId: '',
      rentPerMonth: '', leaseStart: format(new Date(), 'yyyy-MM-dd'),
      leaseEnd: '', joiningFee: 0, depositAmount: 0, depositPaid: false,
      documentUrl: ''
    };
    loadAvailableUnits(form.propertyId);
    showModal = true;
  }

  async function loadAvailableUnits(propertyId) {
    availableUnits = propertyId ? await getAvailableUnits(propertyId) : [];
  }

  async function save() {
    const customer = customers.find(c => c.id === form.customerId);
    const unit = availableUnits.find(u => u.id === form.unitId) || { name: '' };
    const property = properties.find(p => p.id === form.propertyId);

    const leaseData = {
      propertyId: form.propertyId,
      unitId: form.unitId,
      unitName: unit.name,
      customerId: form.customerId,
      customerName: customer?.name || '',
      customerPhone: customer?.phone || '',
      rentPerMonth: Number(form.rentPerMonth),
      leaseStart: new Date(form.leaseStart),
      leaseEnd: form.leaseEnd ? new Date(form.leaseEnd) : null,
      joiningFee: Number(form.joiningFee),
      depositAmount: Number(form.depositAmount),
      depositPaid: form.depositPaid,
      documentUrl: form.documentUrl || null,
      status: 'active',
      createdBy: $user.uid
    };

    const leaseRef = await addLease(leaseData);

    // Mark unit occupied
    await updateUnit(form.unitId, { status: 'occupied', currentLeaseId: leaseRef.id });

    // Record joining fee transaction if provided
    if (leaseData.joiningFee > 0) {
      await addTransaction({
        leaseId: leaseRef.id, unitId: form.unitId, unitName: unit.name,
        customerId: form.customerId, customerName: customer?.name || '',
        propertyId: form.propertyId, propertyName: property?.name || '',
        source: 'lease', amount: leaseData.joiningFee, type: 'other',
        period: format(new Date(), 'MMMM yyyy'), status: 'paid',
        paidOn: new Date(), dueDate: new Date(),
        notes: 'Joining fee on lease creation', createdBy: $user.uid
      });
    }

    // Record deposit transaction if provided
    if (leaseData.depositAmount > 0) {
      await addTransaction({
        leaseId: leaseRef.id, unitId: form.unitId, unitName: unit.name,
        customerId: form.customerId, customerName: customer?.name || '',
        propertyId: form.propertyId, propertyName: property?.name || '',
        source: 'lease', amount: leaseData.depositAmount, type: 'deposit',
        period: format(new Date(), 'MMMM yyyy'),
        status: form.depositPaid ? 'paid' : 'pending',
        paidOn: form.depositPaid ? new Date() : null,
        dueDate: new Date(), notes: 'Security deposit', createdBy: $user.uid
      });
    }

    showModal = false;
    await load();
  }

  async function terminate() {
    if (!terminatingLease) return;
    await updateLease(terminatingLease.id, {
      status: 'terminated',
      terminatedAt: new Date(),
      terminationNotes: terminateNotes
    });
    await updateUnit(terminatingLease.unitId, { status: 'available', currentLeaseId: null });
    showTerminateModal = false;
    terminatingLease = null;
    terminateNotes = '';
    await load();
  }

  function openTerminate(lease) {
    terminatingLease = lease;
    terminateNotes = '';
    showTerminateModal = true;
  }

  function openEditLease(lease) {
    editingLease = lease;
    editLeaseForm = {
      rentPerMonth: lease.rentPerMonth,
      depositAmount: lease.depositAmount
    };
    showEditLeaseModal = true;
  }

  async function doEditLease() {
    await updateLease(editingLease.id, {
      rentPerMonth: Number(editLeaseForm.rentPerMonth),
      depositAmount: Number(editLeaseForm.depositAmount) || 0
    });
    showEditLeaseModal = false;
    await load();
  }

  function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return format(d, 'dd MMM yyyy');
  }

  function propertyName(id) {
    return properties.find(p => p.id === id)?.name || '—';
  }

  function customerName(id) {
    return customers.find(c => c.id === id)?.name || '—';
  }
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">Leases</h1>
      <p class="text-sm text-gray-500 mt-0.5">{leases.length} {activeTab} leases</p>
    </div>
    {#if activeTab === 'active'}
      <button class="btn-primary" on:click={openModal}>+ New Lease</button>
    {/if}
  </div>

  <!-- Tabs -->
  <div class="flex gap-2 border-b pb-1">
    {#each ['active', 'expired', 'terminated'] as tab}
      <button
        class="px-4 py-1.5 text-sm font-medium rounded-t-lg transition-colors
          {activeTab === tab ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
        on:click={() => activeTab = tab}
      >
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="space-y-2">
      {#each Array(4) as _}
        <div class="card animate-pulse h-20"></div>
      {/each}
    </div>
  {:else if leases.length === 0}
    <div class="card text-center py-16">
      <p class="text-4xl mb-3">📋</p>
      <p class="text-gray-500">No {activeTab} leases.</p>
      {#if activeTab === 'active'}
        <button class="btn-primary mt-4" on:click={openModal}>Create Lease</button>
      {/if}
    </div>
  {:else}
    <div class="card p-0 overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Tenant</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Unit</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Property</th>
            <th class="text-right px-4 py-3 font-medium text-gray-600">Rent/mo</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Start</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">End</th>
            {#if activeTab === 'active'}
              <th class="px-4 py-3"></th>
            {/if}
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each leases as lease}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{lease.customerName || customerName(lease.customerId)}</p>
                {#if lease.terminationNotes && activeTab === 'terminated'}
                  <p class="text-xs text-gray-400 truncate max-w-[120px]">{lease.terminationNotes}</p>
                {/if}
              </td>
              <td class="px-4 py-3 text-gray-700">{lease.unitName || '—'}</td>
              <td class="px-4 py-3 text-gray-500">{propertyName(lease.propertyId)}</td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900">₹{(lease.rentPerMonth || 0).toLocaleString('en-IN')}</td>
              <td class="px-4 py-3 text-gray-500">{formatDate(lease.leaseStart)}</td>
              <td class="px-4 py-3 text-gray-500">{lease.leaseEnd ? formatDate(lease.leaseEnd) : 'Month-to-month'}</td>
              {#if activeTab === 'active'}
                <td class="px-4 py-3">
                  <div class="flex gap-2">
                    <button class="btn-secondary text-xs py-1 px-2" on:click={() => openEditLease(lease)}>Edit</button>
                    <button class="btn-danger text-xs py-1 px-2" on:click={() => openTerminate(lease)}>Terminate</button>
                  </div>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- New Lease Modal -->
<Modal title="New Lease" bind:open={showModal} size="lg">
  <form on:submit|preventDefault={save} class="space-y-4">
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Property *</label>
        <select class="input" bind:value={form.propertyId} on:change={() => loadAvailableUnits(form.propertyId)} required>
          <option value="">Select property...</option>
          {#each properties as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="label">Unit *</label>
        <select class="input" bind:value={form.unitId} required>
          <option value="">Select unit...</option>
          {#each availableUnits as u}
            <option value={u.id}>{u.name}{u.type ? ` (${u.type})` : ''}</option>
          {/each}
        </select>
      </div>
    </div>
    <div>
      <label class="label">Tenant *</label>
      <select class="input" bind:value={form.customerId} required>
        <option value="">Select customer...</option>
        {#each customers as c}
          <option value={c.id}>{c.name}{c.phone ? ` – ${c.phone}` : ''}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="label">Monthly Rent (₹) *</label>
      <input class="input" type="number" bind:value={form.rentPerMonth} min="0" required />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Lease Start *</label>
        <input class="input" type="date" bind:value={form.leaseStart} required />
      </div>
      <div>
        <label class="label">Lease End</label>
        <input class="input" type="date" bind:value={form.leaseEnd} />
        <p class="text-xs text-gray-400 mt-0.5">Leave blank for month-to-month</p>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Joining Fee (₹)</label>
        <input class="input" type="number" bind:value={form.joiningFee} min="0" />
      </div>
      <div>
        <label class="label">Security Deposit (₹)</label>
        <input class="input" type="number" bind:value={form.depositAmount} min="0" />
      </div>
    </div>
    {#if form.depositAmount > 0}
      <div class="flex items-center gap-2">
        <input type="checkbox" id="depositPaid" bind:checked={form.depositPaid} class="w-4 h-4 rounded" />
        <label for="depositPaid" class="text-sm text-gray-700">Deposit collected upfront</label>
      </div>
    {/if}
    <div>
      <label class="label">Document URL</label>
      <input class="input" type="url" bind:value={form.documentUrl} placeholder="https://... (optional)" />
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">Create Lease</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showModal = false}>Cancel</button>
    </div>
  </form>
</Modal>

<!-- Edit Lease Modal -->
<Modal title="Edit Lease – {editingLease?.unitName}" bind:open={showEditLeaseModal}>
  <form on:submit|preventDefault={doEditLease} class="space-y-4">
    <div>
      <label class="label">Monthly Rent (₹)</label>
      <input class="input" type="number" bind:value={editLeaseForm.rentPerMonth} min="0" required />
    </div>
    <div>
      <label class="label">Advance / Deposit (₹)</label>
      <input class="input" type="number" bind:value={editLeaseForm.depositAmount} min="0" />
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">Save Changes</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showEditLeaseModal = false}>Cancel</button>
    </div>
  </form>
</Modal>

<!-- Terminate Modal -->
<Modal title="Terminate Lease" bind:open={showTerminateModal}>
  {#if terminatingLease}
    <div class="space-y-4">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
        <p><strong>Tenant:</strong> {terminatingLease.customerName}</p>
        <p><strong>Unit:</strong> {terminatingLease.unitName}</p>
        <p><strong>Since:</strong> {formatDate(terminatingLease.leaseStart)}</p>
      </div>
      <p class="text-sm text-gray-600">This will mark the unit as available and close the lease.</p>
      <div>
        <label class="label">Termination Notes</label>
        <textarea class="input" rows="2" bind:value={terminateNotes} placeholder="Reason for termination..."></textarea>
      </div>
      <div class="flex gap-3 pt-2">
        <button class="btn-danger flex-1" on:click={terminate}>Confirm Termination</button>
        <button class="btn-secondary flex-1" on:click={() => showTerminateModal = false}>Cancel</button>
      </div>
    </div>
  {/if}
</Modal>
