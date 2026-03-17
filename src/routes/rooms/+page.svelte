<script>
  import { onMount } from 'svelte';
  import { getRooms, addRoom, updateRoom, deleteRoom, getBeds, addBed, updateBed, deleteBed, getProperties } from '$lib/stores/data';
  import { pendingAction } from '$lib/stores/shortcuts';
  import Modal from '$lib/components/Modal.svelte';

  let rooms = [];
  let beds = [];
  let properties = [];
  let loading = true;
  let selectedRoom = null;
  let showRoomModal = false;
  let showBedModal = false;
  let deletingId = null;
  let selectedPropertyId = '';

  let roomForm = { name: '', floor: 1, propertyId: '' };
  let bedForm = { count: 1, roomId: '' };
  let editingBedForm = { bedNumber: '', roomId: '', status: 'available' };
  let editingRoom = null;
  let editingBed = null;

  // Derive a short prefix from room name: "Room 01" → "R01", "101" → "R101"
  function roomPrefix(room) {
    const digits = room.name.match(/\d+/g);
    if (digits) return 'R' + digits.join('');
    return 'R' + room.name.replace(/\s+/g, '').slice(0, 3).toUpperCase();
  }

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function indexToLetter(i) {
    if (i < 26) return LETTERS[i];
    return LETTERS[Math.floor(i / 26) - 1] + LETTERS[i % 26];
  }

  function previewBedNames(roomId, count) {
    const room = rooms.find(r => r.id === roomId);
    if (!room || count < 1) return [];
    const prefix = roomPrefix(room);
    const existing = bedsForRoom(roomId).length;
    return Array.from({ length: count }, (_, i) => `${prefix}-${indexToLetter(existing + i)}`);
  }

  $: bedPreview = editingBed ? [] : previewBedNames(bedForm.roomId, bedForm.count);

  async function load() {
    loading = true;
    [rooms, beds, properties] = await Promise.all([getRooms(), getBeds(), getProperties()]);
    properties = properties.filter(p => p.type === 'pg' || !p.type);
    loading = false;
  }

  onMount(() => {
    load();
    const unsub = pendingAction.subscribe(action => {
      if (action === 'new-room') {
        openRoomModal();
        pendingAction.set(null);
      }
    });
    return unsub;
  });

  $: filteredRooms = selectedPropertyId
    ? rooms.filter(r => r.propertyId === selectedPropertyId)
    : rooms;

  function bedsForRoom(roomId) {
    return beds.filter(b => b.roomId === roomId);
  }

  function statusColor(status) {
    return status === 'available' ? 'badge-green' : status === 'occupied' ? 'badge-red' : 'badge-yellow';
  }

  function openRoomModal(room = null) {
    editingRoom = room;
    roomForm = room
      ? { name: room.name, floor: room.floor, propertyId: room.propertyId || '' }
      : { name: '', floor: 1, propertyId: selectedPropertyId || '' };
    showRoomModal = true;
  }

  function openBedModal(bed = null, roomId = null) {
    editingBed = bed;
    if (bed) {
      editingBedForm = { bedNumber: bed.bedNumber, roomId: bed.roomId, status: bed.status };
    } else {
      bedForm = { count: 1, roomId: roomId || (rooms[0]?.id || '') };
    }
    showBedModal = true;
  }

  async function saveRoom() {
    const data = { ...roomForm, propertyId: roomForm.propertyId || null };
    if (editingRoom) {
      await updateRoom(editingRoom.id, data);
    } else {
      await addRoom(data);
    }
    showRoomModal = false;
    await load();
  }

  async function saveBed() {
    if (editingBed) {
      await updateBed(editingBed.id, editingBedForm);
    } else {
      const names = previewBedNames(bedForm.roomId, bedForm.count);
      await Promise.all(names.map(name => addBed({ bedNumber: name, roomId: bedForm.roomId, status: 'available' })));
    }
    showBedModal = false;
    await load();
  }

  async function removeRoom(id) {
    if (!confirm('Delete this room? All beds in this room will be removed too.')) return;
    const roomBeds = bedsForRoom(id);
    await Promise.all(roomBeds.map(b => deleteBed(b.id)));
    await deleteRoom(id);
    await load();
  }

  async function removeBed(id) {
    if (!confirm('Delete this bed?')) return;
    await deleteBed(id);
    await load();
  }
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">PG Rooms</h1>
      <p class="text-sm text-gray-500 mt-0.5">{filteredRooms.length} rooms · {beds.length} total beds · {beds.filter(b => b.status === 'available').length} available</p>
    </div>
    <button class="btn-primary" on:click={() => openRoomModal()}>+ Add Room</button>
  </div>

  <!-- Property filter -->
  {#if properties.length > 0}
    <select class="input max-w-xs" bind:value={selectedPropertyId}>
      <option value="">All PG Properties</option>
      {#each properties as p}
        <option value={p.id}>{p.name}</option>
      {/each}
    </select>
  {/if}

  {#if loading}
    <div class="space-y-4">
      {#each Array(3) as _}
        <div class="card animate-pulse h-32 bg-gray-100"></div>
      {/each}
    </div>
  {:else if filteredRooms.length === 0}
    <div class="card text-center py-16">
      <p class="text-4xl mb-3">🛏️</p>
      <p class="text-gray-500">No rooms yet. Add your first room to get started.</p>
      <button class="btn-primary mt-4" on:click={() => openRoomModal()}>Add Room</button>
    </div>
  {:else}
    <div class="space-y-4">
      {#each filteredRooms as room}
        {@const roomBeds = bedsForRoom(room.id)}
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">{room.name}</h2>
              <p class="text-sm text-gray-500">
                Floor {room.floor} ·
                {roomBeds.filter(b => b.status === 'available').length}/{roomBeds.length} available
                {#if room.propertyId}
                  · <span class="text-blue-600">{properties.find(p => p.id === room.propertyId)?.name || ''}</span>
                {/if}
              </p>
            </div>
            <div class="flex gap-2">
              <button class="btn-secondary text-sm py-1.5" on:click={() => openBedModal(null, room.id)}>+ Add Bed</button>
              <button class="btn-secondary text-sm py-1.5" on:click={() => openRoomModal(room)}>Edit</button>
              <button class="btn-danger text-sm py-1.5" on:click={() => removeRoom(room.id)}>Delete</button>
            </div>
          </div>

          {#if roomBeds.length === 0}
            <p class="text-sm text-gray-400 italic">No beds in this room yet.</p>
          {:else}
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {#each roomBeds as bed}
                <div class="border rounded-lg p-2 text-center relative group">
                  <p class="font-semibold text-gray-900 text-sm">{bed.bedNumber}</p>
                  <span class="{statusColor(bed.status)} mt-1 text-xs">{bed.status}</span>
                  <div class="absolute inset-0 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                    <button class="text-xs text-blue-600 hover:underline" on:click={() => openBedModal(bed)}>Edit</button>
                    <span class="text-gray-300">|</span>
                    <button class="text-xs text-red-600 hover:underline" on:click={() => removeBed(bed.id)}>Del</button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Room Modal -->
<Modal title={editingRoom ? 'Edit Room' : 'Add Room'} bind:open={showRoomModal}>
  <form on:submit|preventDefault={saveRoom} class="space-y-4">
    <div>
      <label class="label">Room Name</label>
      <input class="input" bind:value={roomForm.name} placeholder="e.g., Room 101" required />
    </div>
    <div>
      <label class="label">Floor</label>
      <input class="input" type="number" bind:value={roomForm.floor} min="0" required />
    </div>
    {#if properties.length > 0}
      <div>
        <label class="label">Property</label>
        <select class="input" bind:value={roomForm.propertyId}>
          <option value="">No property</option>
          {#each properties as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
      </div>
    {/if}
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">{editingRoom ? 'Update' : 'Add Room'}</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showRoomModal = false}>Cancel</button>
    </div>
  </form>
</Modal>

<!-- Bed Modal -->
<Modal title={editingBed ? 'Edit Bed' : 'Add Beds'} bind:open={showBedModal}>
  <form on:submit|preventDefault={saveBed} class="space-y-4">
    {#if editingBed}
      <!-- Edit: single bed name + status -->
      <div>
        <label class="label">Bed Name</label>
        <input class="input" bind:value={editingBedForm.bedNumber} required />
      </div>
      <div>
        <label class="label">Status</label>
        <select class="input" bind:value={editingBedForm.status}>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>
    {:else}
      <!-- Add: room + count, auto-name beds -->
      <div>
        <label class="label">Room</label>
        <select class="input" bind:value={bedForm.roomId} required>
          {#each rooms as room}
            <option value={room.id}>{room.name}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="label">Number of Beds</label>
        <input class="input" type="number" bind:value={bedForm.count} min="1" max="50" required />
      </div>
      {#if bedPreview.length > 0}
        <div class="rounded-xl p-3 space-y-1.5" style="background: var(--bg-base); border: 1px solid var(--border);">
          <p class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--text-3);">Will be created</p>
          <div class="flex flex-wrap gap-1.5">
            {#each bedPreview as name}
              <span class="px-2 py-0.5 rounded-md text-xs font-semibold mono"
                style="background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(245,158,11,0.2);">{name}</span>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">
        {editingBed ? 'Update Bed' : `Add ${bedForm.count} Bed${bedForm.count > 1 ? 's' : ''}`}
      </button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showBedModal = false}>Cancel</button>
    </div>
  </form>
</Modal>
