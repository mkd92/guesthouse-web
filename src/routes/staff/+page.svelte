<script>
  import { onMount } from 'svelte';
  import { getStaff, updateUserProfile } from '$lib/stores/data';
  import { userProfile, isAdmin } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { format } from 'date-fns';

  let staff = [];
  let loading = true;

  async function load() {
    loading = true;
    staff = await getStaff();
    loading = false;
  }

  onMount(async () => {
    if (!$isAdmin) { goto('/dashboard'); return; }
    await load();
  });

  async function toggleRole(member) {
    const newRole = member.role === 'admin' ? 'staff' : 'admin';
    if (!confirm(`Change ${member.name}'s role to ${newRole}?`)) return;
    await updateUserProfile(member.id, { role: newRole });
    await load();
  }

  function formatDate(ts) {
    if (!ts) return '—';
    return format(new Date(ts), 'dd MMM yyyy');
  }
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">Staff Management</h1>
      <p class="text-sm text-gray-500 mt-0.5">Manage who has access to this system</p>
    </div>
  </div>

  <div class="card">
    <h2 class="font-medium text-gray-900 mb-1">How to add staff</h2>
    <p class="text-sm text-gray-500">
      Ask new staff members to <a href="/login" class="text-blue-600 hover:underline">register</a> using their email.
      They will be added as "staff" role. You can promote them to admin below.
    </p>
  </div>

  {#if loading}
    <div class="space-y-2">
      {#each Array(3) as _}
        <div class="card animate-pulse h-16"></div>
      {/each}
    </div>
  {:else}
    <div class="card p-0 overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Name</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Email</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Role</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each staff as member}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-semibold text-sm">
                    {member.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span class="font-medium text-gray-900">{member.name}</span>
                  {#if member.id === $userProfile?.id}
                    <span class="badge-blue text-xs">You</span>
                  {/if}
                </div>
              </td>
              <td class="px-4 py-3 text-gray-500">{member.email}</td>
              <td class="px-4 py-3">
                {#if member.role === 'admin'}
                  <span class="badge-blue">Admin</span>
                {:else}
                  <span class="badge-gray">Staff</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-gray-400">{formatDate(member.createdAt)}</td>
              <td class="px-4 py-3">
                {#if member.id !== $userProfile?.id}
                  <button
                    class="btn-secondary text-xs py-1 px-2"
                    on:click={() => toggleRole(member)}
                  >
                    Make {member.role === 'admin' ? 'Staff' : 'Admin'}
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
