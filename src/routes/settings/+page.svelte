<script>
  import { onMount } from 'svelte';
  import { getCategories, addCategory, updateCategory, deleteCategory } from '$lib/stores/data';
  import Modal from '$lib/components/Modal.svelte';

  let expenseCategories = [];
  let incomeCategories = [];
  let loading = true;

  let showModal = false;
  let editingCategory = null;
  let modalType = 'expense';
  let form = { name: '', color: 'blue' };
  let error = '';

  const colorOptions = [
    { value: 'red',    label: 'Red' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'green',  label: 'Green' },
    { value: 'blue',   label: 'Blue' },
    { value: 'purple', label: 'Purple' },
    { value: 'orange', label: 'Orange' },
  ];

  const colorClass = {
    red: 'badge-red', yellow: 'badge-yellow', green: 'badge-green',
    blue: 'badge-blue', purple: 'badge-purple', orange: 'badge-yellow'
  };

  const colorDot = {
    red: 'bg-red-400', yellow: 'bg-yellow-400', green: 'bg-green-400',
    blue: 'bg-blue-400', purple: 'bg-purple-400', orange: 'bg-orange-400'
  };

  async function load() {
    loading = true;
    [expenseCategories, incomeCategories] = await Promise.all([
      getCategories('expense'),
      getCategories('income')
    ]);
    loading = false;
  }

  onMount(load);

  function openAdd(type) {
    modalType = type;
    editingCategory = null;
    form = { name: '', color: 'blue' };
    error = '';
    showModal = true;
  }

  function openEdit(cat) {
    modalType = cat.type;
    editingCategory = cat;
    form = { name: cat.name, color: cat.color || 'blue' };
    error = '';
    showModal = true;
  }

  async function save() {
    error = '';
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name: form.name, color: form.color });
      } else {
        await addCategory({ name: form.name, color: form.color, type: modalType });
      }
      showModal = false;
      await load();
    } catch (e) {
      error = e.message || 'Failed to save category';
    }
  }

  async function remove(cat) {
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    try {
      await deleteCategory(cat.id);
      await load();
    } catch (e) {
      alert(e.message || 'Failed to delete category');
    }
  }
</script>

<div class="p-4 md:p-6 space-y-8 max-w-3xl mx-auto">
  <div>
    <h1 class="hidden md:block text-2xl font-bold text-gray-900">Settings</h1>
    <p class="text-sm text-gray-500 mt-0.5">Manage categories for expenses and income</p>
  </div>

  {#if loading}
    <div class="space-y-2">
      {#each Array(6) as _}
        <div class="card animate-pulse h-12"></div>
      {/each}
    </div>
  {:else}
    <!-- Expense Categories -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-800">Expense Categories</h2>
        <button class="btn-primary text-sm" on:click={() => openAdd('expense')}>+ Add</button>
      </div>
      {#if expenseCategories.length === 0}
        <p class="text-sm text-gray-400 py-4 text-center">No expense categories yet.</p>
      {:else}
        <div class="card p-0 overflow-hidden divide-y divide-gray-100">
          {#each expenseCategories as cat}
            <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
              <div class="w-3 h-3 rounded-full flex-shrink-0 {colorDot[cat.color] || 'bg-gray-400'}"></div>
              <span class="flex-1 text-sm font-medium text-gray-800">{cat.name}</span>
              <span class="{colorClass[cat.color] || 'badge-blue'} text-xs capitalize">{cat.color}</span>
              <div class="flex gap-1">
                <button class="btn-secondary text-xs py-1 px-2" on:click={() => openEdit(cat)}>Edit</button>
                <button class="btn-danger text-xs py-1 px-2" on:click={() => remove(cat)}>Del</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Income Categories -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-gray-800">Income Categories</h2>
        <button class="btn-primary text-sm" on:click={() => openAdd('income')}>+ Add</button>
      </div>
      {#if incomeCategories.length === 0}
        <p class="text-sm text-gray-400 py-4 text-center">No income categories yet.</p>
      {:else}
        <div class="card p-0 overflow-hidden divide-y divide-gray-100">
          {#each incomeCategories as cat}
            <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
              <div class="w-3 h-3 rounded-full flex-shrink-0 {colorDot[cat.color] || 'bg-gray-400'}"></div>
              <span class="flex-1 text-sm font-medium text-gray-800">{cat.name}</span>
              <span class="{colorClass[cat.color] || 'badge-blue'} text-xs capitalize">{cat.color}</span>
              <div class="flex gap-1">
                <button class="btn-secondary text-xs py-1 px-2" on:click={() => openEdit(cat)}>Edit</button>
                <button class="btn-danger text-xs py-1 px-2" on:click={() => remove(cat)}>Del</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<Modal title="{editingCategory ? 'Edit' : 'Add'} {modalType === 'expense' ? 'Expense' : 'Income'} Category" bind:open={showModal}>
  <form on:submit|preventDefault={save} class="space-y-4">
    <div>
      <label class="label">Name *</label>
      <input class="input" bind:value={form.name} placeholder="Category name" required />
    </div>
    <div>
      <label class="label">Color</label>
      <div class="flex gap-2 flex-wrap mt-1">
        {#each colorOptions as opt}
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all {form.color === opt.value ? 'border-gray-400 bg-gray-100 font-medium' : 'border-gray-200 hover:border-gray-300'}"
            on:click={() => form.color = opt.value}
          >
            <span class="w-3 h-3 rounded-full {colorDot[opt.value]}"></span>
            {opt.label}
          </button>
        {/each}
      </div>
    </div>
    {#if error}
      <p class="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>
    {/if}
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">{editingCategory ? 'Update' : 'Add'}</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showModal = false}>Cancel</button>
    </div>
  </form>
</Modal>
