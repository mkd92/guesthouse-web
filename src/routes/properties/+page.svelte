<script>
  import { onMount } from 'svelte';
  import { getProperties, addProperty, updateProperty, deleteProperty, getRooms, getUnits, getLeases } from '$lib/stores/data';
  import { isAdmin } from '$lib/stores/auth';
  import { user } from '$lib/stores/auth';
  import { pendingAction } from '$lib/stores/shortcuts';
  import Modal from '$lib/components/Modal.svelte';

  let properties = [];
  let loading = true;
  let showModal = false;
  let editingProperty = null;
  let saving = false;
  let saveError = '';

  let form = {
    name: '', address: '', type: 'pg',
    joiningFee: 0, refundableDeposit: 0,
    description: '', active: true
  };

  // Per-property stats cache
  let propStats = {};

  async function load() {
    loading = true;
    properties = await getProperties();
    // Load stats for each property in parallel
    await Promise.all(properties.map(async (p) => {
      if (p.type === 'pg') {
        const rooms = await getRooms(p.id);
        propStats[p.id] = { count: rooms.length, label: 'rooms' };
      } else {
        const [units, leases] = await Promise.all([getUnits(p.id), getLeases({ propertyId: p.id, status: 'active' })]);
        propStats[p.id] = { count: units.length, occupied: leases.length, label: 'units' };
      }
    }));
    propStats = { ...propStats };
    loading = false;
  }

  onMount(() => {
    load();
    const unsub = pendingAction.subscribe(action => {
      if (action === 'new-property') {
        openModal();
        pendingAction.set(null);
      }
    });
    return unsub;
  });

  function openModal(property = null) {
    editingProperty = property;
    saveError = '';
    form = property
      ? { name: property.name, address: property.address || '', type: property.type, joiningFee: property.joiningFee || 0, refundableDeposit: property.refundableDeposit || 0, description: property.description || '', active: property.active !== false }
      : { name: '', address: '', type: 'pg', joiningFee: 0, refundableDeposit: 0, description: '', active: true };
    showModal = true;
  }

  async function save() {
    saving = true;
    saveError = '';
    try {
      const data = { ...form, joiningFee: Number(form.joiningFee), refundableDeposit: Number(form.refundableDeposit) };
      if (editingProperty) {
        await updateProperty(editingProperty.id, data);
      } else {
        await addProperty({ ...data, createdBy: $user.uid });
      }
      showModal = false;
      await load();
    } catch (e) {
      saveError = e?.message || 'Failed to save. Check your permissions.';
    } finally {
      saving = false;
    }
  }

  async function remove(id) {
    if (!confirm('Delete this property? This will not delete associated rooms/units.')) return;
    await deleteProperty(id);
    await load();
  }

  const typeBadge = { pg: 'badge-blue', residential: 'badge-green', commercial: 'badge-yellow' };
  const typeLabel = { pg: 'PG', residential: 'Residential', commercial: 'Commercial' };
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">Properties</h1>
      <p class="text-sm text-gray-500 mt-0.5">{properties.length} properties</p>
    </div>
    {#if $isAdmin}
      <button class="btn-primary" on:click={() => openModal()}>+ Add Property</button>
    {/if}
  </div>

  {#if loading}
    <div class="grid sm:grid-cols-2 gap-4">
      {#each Array(3) as _}
        <div class="card animate-pulse h-36 bg-gray-100"></div>
      {/each}
    </div>
  {:else if properties.length === 0}
    <div class="card text-center py-16">
      <p class="text-4xl mb-3">🏢</p>
      <p class="text-gray-500">No properties yet.</p>
      {#if $isAdmin}
        <button class="btn-primary mt-4" on:click={() => openModal()}>Add Property</button>
      {/if}
    </div>
  {:else}
    <div class="grid sm:grid-cols-2 gap-4">
      {#each properties as prop}
        {@const s = propStats[prop.id]}
        <div class="card">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="{typeBadge[prop.type] || 'badge-blue'} text-xs">{typeLabel[prop.type] || prop.type}</span>
                {#if !prop.active}
                  <span class="badge-yellow text-xs">Inactive</span>
                {/if}
              </div>
              <h2 class="text-lg font-semibold text-gray-900 truncate">{prop.name}</h2>
              {#if prop.address}
                <p class="text-xs text-gray-400 mt-0.5 truncate">{prop.address}</p>
              {/if}
            </div>
            {#if $isAdmin}
              <div class="flex gap-1 ml-2 flex-shrink-0">
                <button class="btn-secondary text-xs py-1 px-2" on:click={() => openModal(prop)}>Edit</button>
                <button class="btn-danger text-xs py-1 px-2" on:click={() => remove(prop.id)}>Del</button>
              </div>
            {/if}
          </div>

          <div class="grid grid-cols-2 gap-3 text-sm">
            {#if s}
              <div class="bg-gray-50 rounded-lg p-2 text-center">
                <p class="text-lg font-bold text-gray-900">{s.count}</p>
                <p class="text-xs text-gray-500 capitalize">{s.label}</p>
              </div>
              {#if s.occupied !== undefined}
                <div class="bg-blue-50 rounded-lg p-2 text-center">
                  <p class="text-lg font-bold text-blue-700">{s.occupied}</p>
                  <p class="text-xs text-blue-500">Active leases</p>
                </div>
              {/if}
            {/if}
            {#if prop.joiningFee > 0}
              <div class="bg-gray-50 rounded-lg p-2 text-center">
                <p class="text-sm font-semibold text-gray-700">₹{prop.joiningFee.toLocaleString('en-IN')}</p>
                <p class="text-xs text-gray-500">Joining fee</p>
              </div>
            {/if}
            {#if prop.refundableDeposit > 0}
              <div class="bg-gray-50 rounded-lg p-2 text-center">
                <p class="text-sm font-semibold text-gray-700">₹{prop.refundableDeposit.toLocaleString('en-IN')}</p>
                <p class="text-xs text-gray-500">Deposit default</p>
              </div>
            {/if}
          </div>

          {#if prop.description}
            <p class="text-xs text-gray-400 mt-3 line-clamp-2">{prop.description}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<Modal title={editingProperty ? 'Edit Property' : 'Add Property'} bind:open={showModal}>
  <form on:submit|preventDefault={save} class="space-y-4">
    <div>
      <label class="label">Property Name *</label>
      <input class="input" bind:value={form.name} placeholder="e.g., Sunshine PG" required />
    </div>
    <div>
      <label class="label">Type *</label>
      <select class="input" bind:value={form.type}>
        <option value="pg">PG (Paying Guest)</option>
        <option value="residential">Residential Apartments</option>
        <option value="commercial">Commercial Shops</option>
      </select>
    </div>
    <div>
      <label class="label">Address</label>
      <textarea class="input" rows="2" bind:value={form.address} placeholder="Full address"></textarea>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Joining Fee (₹)</label>
        <input class="input" type="number" bind:value={form.joiningFee} min="0" />
      </div>
      <div>
        <label class="label">Refundable Deposit (₹)</label>
        <input class="input" type="number" bind:value={form.refundableDeposit} min="0" />
      </div>
    </div>
    <div>
      <label class="label">Description</label>
      <textarea class="input" rows="2" bind:value={form.description} placeholder="Optional notes about this property"></textarea>
    </div>
    <div class="flex items-center gap-2">
      <input type="checkbox" id="active" bind:checked={form.active} class="w-4 h-4 rounded" />
      <label for="active" class="text-sm text-gray-700">Active</label>
    </div>
    {#if saveError}
      <p class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveError}</p>
    {/if}
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1" disabled={saving}>
        {saving ? 'Saving…' : editingProperty ? 'Update' : 'Add Property'}
      </button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showModal = false}>Cancel</button>
    </div>
  </form>
</Modal>
