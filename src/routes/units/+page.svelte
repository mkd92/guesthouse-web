<script>
  import { onMount } from 'svelte';
  import { getUnits, addUnit, updateUnit, deleteUnit, getProperties } from '$lib/stores/data';
  import { user } from '$lib/stores/auth';
  import Modal from '$lib/components/Modal.svelte';

  let units = [];
  let properties = [];
  let loading = true;
  let selectedPropertyId = '';
  let showModal = false;
  let editingUnit = null;

  let form = { propertyId: '', name: '', floor: '', type: '', area: '', status: 'available' };

  async function load() {
    loading = true;
    [units, properties] = await Promise.all([
      getUnits(selectedPropertyId || null),
      getProperties()
    ]);
    // Only show non-PG properties
    properties = properties.filter(p => p.type !== 'pg');
    loading = false;
  }

  onMount(load);

  $: load(), selectedPropertyId;

  function openModal(unit = null) {
    editingUnit = unit;
    form = unit
      ? { propertyId: unit.propertyId, name: unit.name, floor: unit.floor || '', type: unit.type || '', area: unit.area || '', status: unit.status }
      : { propertyId: selectedPropertyId || (properties[0]?.id || ''), name: '', floor: '', type: '', area: '', status: 'available' };
    showModal = true;
  }

  async function save() {
    const data = { ...form, floor: form.floor || null, area: form.area || null };
    if (editingUnit) {
      await updateUnit(editingUnit.id, data);
    } else {
      await addUnit({ ...data, createdBy: $user.uid });
    }
    showModal = false;
    await load();
  }

  async function remove(id) {
    if (!confirm('Delete this unit?')) return;
    await deleteUnit(id);
    await load();
  }

  function propertyName(id) {
    return properties.find(p => p.id === id)?.name || '—';
  }

  function statusColor(s) {
    return s === 'available' ? 'badge-green' : s === 'occupied' ? 'badge-red' : 'badge-yellow';
  }
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">Units</h1>
      <p class="text-sm text-gray-500 mt-0.5">{units.length} units · {units.filter(u => u.status === 'available').length} available</p>
    </div>
    <button class="btn-primary" on:click={() => openModal()}>+ Add Unit</button>
  </div>

  <!-- Property filter -->
  <select class="input max-w-xs" bind:value={selectedPropertyId}>
    <option value="">All Properties</option>
    {#each properties as p}
      <option value={p.id}>{p.name}</option>
    {/each}
  </select>

  {#if loading}
    <div class="space-y-2">
      {#each Array(5) as _}
        <div class="card animate-pulse h-16"></div>
      {/each}
    </div>
  {:else if units.length === 0}
    <div class="card text-center py-16">
      <p class="text-4xl mb-3">🏗️</p>
      <p class="text-gray-500">No units yet. Add apartments or shops to get started.</p>
      <button class="btn-primary mt-4" on:click={() => openModal()}>Add Unit</button>
    </div>
  {:else}
    <div class="card p-0 overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Unit</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Property</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Type</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Floor</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each units as unit}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{unit.name}</td>
              <td class="px-4 py-3 text-gray-500">{propertyName(unit.propertyId)}</td>
              <td class="px-4 py-3 text-gray-500">{unit.type || '—'}</td>
              <td class="px-4 py-3 text-gray-500">{unit.floor != null ? unit.floor : '—'}</td>
              <td class="px-4 py-3">
                <span class="{statusColor(unit.status)}">{unit.status}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1 justify-end">
                  <button class="btn-secondary text-xs py-1 px-2" on:click={() => openModal(unit)}>Edit</button>
                  <button class="btn-danger text-xs py-1 px-2" on:click={() => remove(unit.id)}>Del</button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<Modal title={editingUnit ? 'Edit Unit' : 'Add Unit'} bind:open={showModal}>
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
      <label class="label">Unit Name *</label>
      <input class="input" bind:value={form.name} placeholder="e.g., A-101 or Shop 5" required />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label" for="unit-type">Type</label>
        <input id="unit-type" class="input" bind:value={form.type} placeholder="e.g., 1BHK, Shop" />
      </div>
      <div>
        <label class="label" for="unit-floor">Floor</label>
        <input id="unit-floor" class="input" type="number" bind:value={form.floor} placeholder="0" min="0" />
      </div>
    </div>
    <div>
      <label class="label" for="unit-area">Area (sq ft)</label>
      <input id="unit-area" class="input" type="number" bind:value={form.area} placeholder="Optional" min="0" />
    </div>
    <div>
      <label class="label" for="unit-status">Status</label>
      <select id="unit-status" class="input" bind:value={form.status}>
        <option value="available">Available</option>
        <option value="occupied">Occupied</option>
        <option value="maintenance">Maintenance</option>
      </select>
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">{editingUnit ? 'Update' : 'Add Unit'}</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showModal = false}>Cancel</button>
    </div>
  </form>
</Modal>
