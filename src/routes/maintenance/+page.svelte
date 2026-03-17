<script>
  import { onMount } from 'svelte';
  import { getMaintenanceRequests, addMaintenanceRequest, updateMaintenanceRequest, getProperties } from '$lib/stores/data';
  import { user } from '$lib/stores/auth';
  import Modal from '$lib/components/Modal.svelte';
  import { format } from 'date-fns';

  let requests = [];
  let properties = [];
  let loading = true;
  let selectedPropertyId = '';
  let selectedStatus = '';
  let showModal = false;
  let showResolveModal = false;
  let resolvingRequest = null;
  let resolveNotes = '';

  let form = {
    propertyId: '', unitLabel: '', title: '',
    description: '', priority: 'medium', assignedTo: ''
  };

  async function load() {
    loading = true;
    const filters = {};
    if (selectedPropertyId) filters.propertyId = selectedPropertyId;
    if (selectedStatus) filters.status = selectedStatus;
    [requests, properties] = await Promise.all([
      getMaintenanceRequests(filters),
      getProperties()
    ]);
    loading = false;
  }

  onMount(load);

  $: load(), selectedPropertyId, selectedStatus;

  function openModal() {
    form = {
      propertyId: selectedPropertyId || (properties[0]?.id || ''),
      unitLabel: '', title: '', description: '', priority: 'medium', assignedTo: ''
    };
    showModal = true;
  }

  async function save() {
    const property = properties.find(p => p.id === form.propertyId);
    await addMaintenanceRequest({
      ...form,
      propertyName: property?.name || '',
      status: 'open',
      reportedBy: $user.uid
    });
    showModal = false;
    await load();
  }

  async function updateStatus(req, newStatus) {
    if (newStatus === 'resolved') {
      resolvingRequest = req;
      resolveNotes = '';
      showResolveModal = true;
      return;
    }
    await updateMaintenanceRequest(req.id, { status: newStatus });
    await load();
  }

  async function resolve() {
    if (!resolveNotes.trim()) return alert('Please add resolution notes.');
    await updateMaintenanceRequest(resolvingRequest.id, {
      status: 'resolved',
      resolvedNotes: resolveNotes,
      resolvedAt: new Date()
    });
    showResolveModal = false;
    resolvingRequest = null;
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

  const priorityColors = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red' };
  const statusColors = { open: 'badge-red', 'in-progress': 'badge-yellow', resolved: 'badge-green' };
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">Maintenance</h1>
      <p class="text-sm text-gray-500 mt-0.5">{requests.length} requests · {requests.filter(r => r.status === 'open').length} open</p>
    </div>
    <button class="btn-primary" on:click={openModal}>+ Log Issue</button>
  </div>

  <!-- Filters -->
  <div class="flex gap-3 flex-wrap">
    <select class="input w-auto" bind:value={selectedPropertyId}>
      <option value="">All Properties</option>
      {#each properties as p}
        <option value={p.id}>{p.name}</option>
      {/each}
    </select>
    <select class="input w-auto" bind:value={selectedStatus}>
      <option value="">All Statuses</option>
      <option value="open">Open</option>
      <option value="in-progress">In Progress</option>
      <option value="resolved">Resolved</option>
    </select>
  </div>

  {#if loading}
    <div class="space-y-2">
      {#each Array(4) as _}
        <div class="card animate-pulse h-20"></div>
      {/each}
    </div>
  {:else if requests.length === 0}
    <div class="card text-center py-16">
      <p class="text-4xl mb-3">🔧</p>
      <p class="text-gray-500">No maintenance requests found.</p>
      <button class="btn-primary mt-4" on:click={openModal}>Log Issue</button>
    </div>
  {:else}
    <div class="space-y-3">
      {#each requests as req}
        <div class="card">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="{priorityColors[req.priority]} capitalize text-xs">{req.priority}</span>
                <span class="{statusColors[req.status]} capitalize text-xs">{req.status}</span>
              </div>
              <h3 class="font-semibold text-gray-900">{req.title}</h3>
              <p class="text-sm text-gray-500 mt-0.5">
                {propertyName(req.propertyId)}{req.unitLabel ? ` · ${req.unitLabel}` : ''}
              </p>
              {#if req.description}
                <p class="text-sm text-gray-600 mt-1">{req.description}</p>
              {/if}
              {#if req.resolvedNotes && req.status === 'resolved'}
                <p class="text-xs text-green-600 mt-1">✓ {req.resolvedNotes}</p>
              {/if}
              <p class="text-xs text-gray-400 mt-2">Logged {formatDate(req.createdAt)}{req.assignedTo ? ` · Assigned to ${req.assignedTo}` : ''}</p>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              {#if req.status === 'open'}
                <button class="btn-secondary text-xs py-1 px-2" on:click={() => updateStatus(req, 'in-progress')}>Start</button>
              {/if}
              {#if req.status === 'in-progress'}
                <button class="btn-success text-xs py-1 px-2" on:click={() => updateStatus(req, 'resolved')}>Resolve</button>
              {/if}
              {#if req.status === 'open'}
                <button class="btn-danger text-xs py-1 px-2" on:click={() => updateStatus(req, 'resolved')}>Close</button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<Modal title="Log Maintenance Issue" bind:open={showModal}>
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
      <label class="label">Unit / Location</label>
      <input class="input" bind:value={form.unitLabel} placeholder="e.g., Unit A-101, Lobby, Roof" />
    </div>
    <div>
      <label class="label">Issue Title *</label>
      <input class="input" bind:value={form.title} placeholder="Brief description of the issue" required />
    </div>
    <div>
      <label class="label">Details</label>
      <textarea class="input" rows="3" bind:value={form.description} placeholder="More details about the issue..."></textarea>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Priority</label>
        <select class="input" bind:value={form.priority}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div>
        <label class="label">Assigned To</label>
        <input class="input" bind:value={form.assignedTo} placeholder="Staff name (optional)" />
      </div>
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">Log Issue</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showModal = false}>Cancel</button>
    </div>
  </form>
</Modal>

<Modal title="Resolve Issue" bind:open={showResolveModal}>
  {#if resolvingRequest}
    <div class="space-y-4">
      <div class="bg-gray-50 rounded-lg p-3 text-sm">
        <p class="font-medium text-gray-900">{resolvingRequest.title}</p>
        <p class="text-gray-500">{propertyName(resolvingRequest.propertyId)}</p>
      </div>
      <div>
        <label class="label">Resolution Notes *</label>
        <textarea class="input" rows="3" bind:value={resolveNotes} placeholder="Describe how the issue was resolved..." required></textarea>
      </div>
      <div class="flex gap-3 pt-2">
        <button class="btn-success flex-1" on:click={resolve}>Mark Resolved</button>
        <button class="btn-secondary flex-1" on:click={() => showResolveModal = false}>Cancel</button>
      </div>
    </div>
  {/if}
</Modal>
